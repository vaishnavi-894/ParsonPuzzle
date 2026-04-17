import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    useDroppable,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { assignmentAPI, attemptAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import DraggableBlock from '../common/DraggableBlock';
import {
    Clock, Send, RotateCcw, Code2, Layers,
    ChevronRight, ChevronLeft, FunctionSquare, Repeat,
    CheckCircle2, ArrowLeftCircle, CircleDashed,
} from 'lucide-react';
import './Student.css';

/* ────────────────────────────────────────────────────────────────────────── */
/*  Droppable wrapper                                                          */
/* ────────────────────────────────────────────────────────────────────────── */
function DroppablePanel({ id, children, className }) {
    const { setNodeRef, isOver } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`${className}${isOver ? ' drop-over' : ''}`}>
            {children}
        </div>
    );
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Pure helper – get scope blocks from raw data (no state dependency)        */
/* ────────────────────────────────────────────────────────────────────────── */
function getScopeBlocksRaw(blocksData, path, headersData) {
    if (path.length === 0) return [];
    if (path.length === 1) {
        const scopeToken = path[0];
        const fnEntry = Object.entries(headersData).find(
            ([, hdr]) => hdr?.scope_id === scopeToken
        );
        const fnName       = fnEntry ? fnEntry[0] : scopeToken;
        const fnHdrScopeId = headersData[fnName]?.scope_id ?? null;
        return blocksData.filter(b =>
            b.function_name === fnName && b.parent_scope_id === fnHdrScopeId
        );
    }
    const parentId = path[path.length - 1];
    return blocksData.filter(b => b.parent_scope_id === parentId);
}

/* ────────────────────────────────────────────────────────────────────────── */
/*  Main component                                                            */
/* ────────────────────────────────────────────────────────────────────────── */
export default function PuzzleSolvePage() {
    const { assignmentId } = useParams();
    const navigate         = useNavigate();
    const { user }         = useAuth();

    /* ── Core puzzle state ─────────────────────────────────────────── */
    const [assignment, setAssignment]           = useState(null);
    const [puzzle, setPuzzle]                   = useState(null);
    const [allBlocks, setAllBlocks]             = useState([]);
    const [functions, setFunctions]             = useState([]);
    const [functionHeaders, setFunctionHeaders] = useState({});

    /* ── Scope navigation ──────────────────────────────────────────── */
    const [scopePath, setScopePath]     = useState([]);
    const [scopeLabels, setScopeLabels] = useState([]);

    /* ── DnD state ─────────────────────────────────────────────────── */
    const [editorBlocks, setEditorBlocks] = useState([]);
    const [bankBlocks, setBankBlocks]     = useState([]);
    const [activeBlock, setActiveBlock]   = useState(null);

    /* ── Resizable panel state ─────────────────────────────────────── */
    const [editorWidthPct, setEditorWidthPct] = useState(65); // 65% editor, 35% bank
    const [blockFontSize, setBlockFontSize]   = useState(13);  // px
    const isDraggingDivider = useRef(false);
    const layoutRef         = useRef(null);

    /* ── Attempt / timer ───────────────────────────────────────────── */
    const [attemptId, setAttemptId]               = useState(null);
    const [startTime, setStartTime]               = useState(null);
    const [loading, setLoading]                   = useState(true);
    const [submitting, setSubmitting]             = useState(false);
    const [error, setError]                       = useState('');
    const [hasActiveAttempt, setHasActiveAttempt] = useState(false);
    const [showStartModal, setShowStartModal]     = useState(false);
    const [elapsed, setElapsed]                   = useState('0:00');
    const [elapsedSeconds, setElapsedSeconds]     = useState(0);
    const [timerStartedAt, setTimerStartedAt]     = useState(null);
    // Tracks when the student FIRST opens a question — timer only starts then

    /* ── Per-scope arranged blocks ─────────────────────────────────── */
    const [scopeEditors, setScopeEditors] = useState({});

    /* ── Pending loop stack ────────────────────────────────────────── */
    // When a loop-header block is dragged into the editor we redirect the
    // student to arrange the loop body FIRST.  Once they click "Done", the
    // loop header is auto-placed at the saved position.  Stack supports
    // nested loops:  [{ block, insertIdx }, ...]
    const [pendingLoopStack, setPendingLoopStack] = useState([]);

    /* ── Stale-closure refs ────────────────────────────────────────── */
    const editorRef = useRef(editorBlocks);
    const bankRef   = useRef(bankBlocks);
    const scopeEditorsRef = useRef(scopeEditors);
    const scopePathRef = useRef(scopePath);
    const scopeLabelsRef = useRef(scopeLabels);
    const pendingLoopStackRef = useRef(pendingLoopStack);
    const elapsedSecondsRef = useRef(elapsedSeconds);
    const timerStartedAtRef = useRef(timerStartedAt);
    useEffect(() => { editorRef.current = editorBlocks; }, [editorBlocks]);
    useEffect(() => { bankRef.current   = bankBlocks;   }, [bankBlocks]);
    useEffect(() => { scopeEditorsRef.current = scopeEditors; }, [scopeEditors]);
    useEffect(() => { scopePathRef.current = scopePath; }, [scopePath]);
    useEffect(() => { scopeLabelsRef.current = scopeLabels; }, [scopeLabels]);
    useEffect(() => { pendingLoopStackRef.current = pendingLoopStack; }, [pendingLoopStack]);
    useEffect(() => { elapsedSecondsRef.current = elapsedSeconds; }, [elapsedSeconds]);
    useEffect(() => { timerStartedAtRef.current = timerStartedAt; }, [timerStartedAt]);

    const scopeKeyStable = (path) => path.join('::') || '__root__';

    const buildScopeEditorsSnapshot = (path = scopePathRef.current, editor = editorRef.current) => (
        path.length === 0
            ? { ...scopeEditorsRef.current }
            : { ...scopeEditorsRef.current, [scopeKeyStable(path)]: editor }
    );

    const persistPuzzleState = ({
        attemptId: attemptIdOverride = attemptId,
        scopePath: scopePathOverride = scopePathRef.current,
        scopeLabels: scopeLabelsOverride = scopeLabelsRef.current,
        editorBlocks: editorBlocksOverride = editorRef.current,
        pendingLoopStack: pendingLoopStackOverride = pendingLoopStackRef.current,
        elapsedSeconds: elapsedSecondsOverride = elapsedSecondsRef.current,
    } = {}) => {
        if (!attemptIdOverride) return;
        const scopeEditorsSnapshot = buildScopeEditorsSnapshot(scopePathOverride, editorBlocksOverride);
        const state = {
            attemptId: attemptIdOverride,
            scopeEditors: scopeEditorsSnapshot,
            currentScopePath: scopePathOverride,
            currentScopeLabels: scopeLabelsOverride,
            currentEditorBlocks: editorBlocksOverride,
            pendingLoopStack: pendingLoopStackOverride,
            elapsedSeconds: elapsedSecondsOverride,
        };
        localStorage.setItem(`parsons_state_${assignmentId}`, JSON.stringify(state));
    };

    const formatElapsed = (secs) => {
        const safeSecs = Math.max(0, Math.floor(secs));
        const m = Math.floor(safeSecs / 60);
        const s = safeSecs % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const getLiveElapsedSeconds = () => {
        const base = elapsedSecondsRef.current ?? 0;
        if (!timerStartedAtRef.current) return base;
        return base + Math.floor((Date.now() - timerStartedAtRef.current) / 1000);
    };

    const stopTimer = () => {
        if (!timerStartedAtRef.current) return elapsedSecondsRef.current ?? 0;
        const nextElapsed = getLiveElapsedSeconds();
        setElapsedSeconds(nextElapsed);
        setTimerStartedAt(null);
        return nextElapsed;
    };

    const ensureTimerRunning = () => {
        if (!hasActiveAttempt) return;
        if (!timerStartedAtRef.current) {
            setTimerStartedAt(Date.now());
        }
    };

    /* ── Sensors ───────────────────────────────────────────────────── */
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    /* ── Divider drag handlers ─────────────────────────────────────── */
    const handleDividerMouseDown = useCallback((e) => {
        e.preventDefault();
        isDraggingDivider.current = true;
        document.body.style.cursor = 'col-resize';
        document.body.style.userSelect = 'none';

        const onMouseMove = (ev) => {
            if (!isDraggingDivider.current || !layoutRef.current) return;
            const rect = layoutRef.current.getBoundingClientRect();
            const rawPct = ((ev.clientX - rect.left) / rect.width) * 100;
            const clamped = Math.min(Math.max(rawPct, 25), 80);
            setEditorWidthPct(clamped);
        };

        const onMouseUp = () => {
            isDraggingDivider.current = false;
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
        };

        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
    }, []);

    /* ── Timer — starts when student first opens a question ────────── */
    useEffect(() => {
        const calc = () => setElapsed(formatElapsed(getLiveElapsedSeconds()));
        calc();
        if (!timerStartedAt) return;
        const id = setInterval(calc, 1000);
        return () => clearInterval(id);
    }, [elapsedSeconds, timerStartedAt]);

    /* ── Persist state to localStorage on every relevant change ─────── */
    useEffect(() => {
        persistPuzzleState();
    }, [attemptId, scopeEditors, editorBlocks, scopePath, scopeLabels, pendingLoopStack, elapsedSeconds]);

    useEffect(() => {
        return () => {
            persistPuzzleState({ elapsedSeconds: getLiveElapsedSeconds() });
        };
    }, [assignmentId, attemptId]);

    /* ── Load ──────────────────────────────────────────────────────── */
    useEffect(() => { loadPuzzle(); }, [assignmentId]);

    const loadPuzzle = async () => {
        try {
            setLoading(true);
            const response = await assignmentAPI.getPuzzle(assignmentId);
            const { assignment: asgn, puzzle: puzz, blocks, functions: fns } = response.data;

            setAssignment(asgn);
            setPuzzle(puzz);
            setAllBlocks(blocks);

            const fnList = fns && fns.length > 0
                ? fns
                : [...new Set(blocks.map(b => b.function_name).filter(Boolean))];
            setFunctions(fnList);

            const hdrs = {};
            for (const fn of fnList) {
                const hdr = blocks.find(b => b.function_name === fn && b.is_scope_header && b.scope_type === 'function');
                if (hdr) hdrs[fn] = hdr;
            }
            setFunctionHeaders(hdrs);

            const attemptsRes = await attemptAPI.getAll({ assignment_id: assignmentId });
            const attempts    = attemptsRes.data;
            const active      = attempts.find(a => !a.submitted_at);

            if (active) {
                setAttemptId(active.attempt_id);
                setStartTime(new Date(active.started_at).getTime());
                setHasActiveAttempt(true);

                // ── Restore from localStorage ────────────────────────
                const storageKey = `parsons_state_${assignmentId}`;
                let restored = false;
                try {
                    const savedRaw = localStorage.getItem(storageKey);
                    if (savedRaw) {
                        const saved = JSON.parse(savedRaw);
                        if (saved.attemptId === active.attempt_id) {
                            setScopeEditors(saved.scopeEditors || {});

                            // Restore timer
                            setElapsedSeconds(saved.elapsedSeconds || 0);
                            setTimerStartedAt(null);
                            setElapsed(formatElapsed(saved.elapsedSeconds || 0));
                            setPendingLoopStack(saved.pendingLoopStack || []);

                            // Restore scope navigation
                            const restoredPath   = saved.currentScopePath   || [];
                            const restoredLabels = saved.currentScopeLabels || [];
                            setScopePath(restoredPath);
                            setScopeLabels(restoredLabels);

                            // Restore live editor + bank for the current scope
                            if (restoredPath.length > 0) {
                                const restoredEditor = saved.currentEditorBlocks || [];
                                const scopeAll = getScopeBlocksRaw(blocks, restoredPath, hdrs);
                                const placedIds = new Set(restoredEditor.map(b => b.block_id));
                                setEditorBlocks(restoredEditor);
                                setBankBlocks(scopeAll.filter(b => !placedIds.has(b.block_id)));
                            }
                            restored = true;
                        }
                    }
                } catch (e) {
                    console.error('Failed to restore puzzle state from localStorage', e);
                }
                if (!restored) {
                    setScopePath([]);
                    setScopeLabels([]);
                    setEditorBlocks([]);
                    setBankBlocks([]);
                    setPendingLoopStack([]);
                    setElapsedSeconds(0);
                    setTimerStartedAt(null);
                    setElapsed('0:00');
                }
            } else {
                const done = attempts.some(a => a.is_correct);
                if (!done) setShowStartModal(true);
                setScopePath([]);
                setScopeLabels([]);
                setEditorBlocks([]);
                setBankBlocks([]);
                setPendingLoopStack([]);
                setElapsedSeconds(0);
                setTimerStartedAt(null);
                setElapsed('0:00');
            }
        } catch {
            setError('Failed to load puzzle');
        } finally {
            setLoading(false);
        }
    };

    /* ── Start attempt ─────────────────────────────────────────────── */
    const handleStartAttempt = async () => {
        try {
            setLoading(true);
            const res = await attemptAPI.create({
                assignment_id: assignmentId,
                started_at: new Date().toISOString(),
            });
            setAttemptId(res.data.attempt_id);
            setStartTime(Date.now());
            setHasActiveAttempt(true);
            setShowStartModal(false);
            setElapsedSeconds(0);
            setTimerStartedAt(null);
            setElapsed('0:00');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to start attempt');
        } finally {
            setLoading(false);
        }
    };

    /* ── Scope key ─────────────────────────────────────────────────── */
    const scopeKey = (path) => path.join('::') || '__root__';

    /* ── Enter an arbitrary scope path ─────────────────────────────── */
    const navigateToScope = (newPath, newLabels, currentEditorOverride = null) => {
        const currentEditor = currentEditorOverride ?? editorBlocks;
        const scopeEditorsSnapshot = buildScopeEditorsSnapshot(scopePath, currentEditor);

        // Save current editor state to its proper scope key BEFORE navigating
        setScopeEditors(scopeEditorsSnapshot);

        setScopePath(newPath);
        setScopeLabels(newLabels);

        const newKey = scopeKey(newPath);
        const saved  = scopeEditorsSnapshot[newKey] || [];
        loadScopeView(newPath, saved);
    };

    /* ── Enter a scope (relative to current path) ──────────────────── */
    const enterScope = (newScopeId, label, currentEditorOverride = null) => {
        navigateToScope([...scopePath, newScopeId], [...scopeLabels, label], currentEditorOverride);
    };

    /* ── Go back one level ─────────────────────────────────────────── */
    const goBack = () => {
        ensureTimerRunning();
        const currentKey = scopeKey(scopePath);
        const scopeEditorsSnapshot = { ...scopeEditors, [currentKey]: editorBlocks };

        // Save current scope editor
        setScopeEditors(scopeEditorsSnapshot);

        const newPath   = scopePath.slice(0, -1);
        const newLabels = scopeLabels.slice(0, -1);
        setScopePath(newPath);
        setScopeLabels(newLabels);

        const newKey = scopeKey(newPath);
        let savedEditor = scopeEditorsSnapshot[newKey] || [];

        // If we just finished a pending-loop body, auto-place the loop header
        if (pendingLoopStack.length > 0) {
            const { block: loopBlock, insertIdx } = pendingLoopStack[pendingLoopStack.length - 1];
            const idx = Math.min(insertIdx, savedEditor.length);
            savedEditor = [
                ...savedEditor.slice(0, idx),
                loopBlock,
                ...savedEditor.slice(idx),
            ];
            setScopeEditors(prev => ({ ...prev, [newKey]: savedEditor }));
            setPendingLoopStack(prev => prev.slice(0, -1));
        }

        loadScopeView(newPath, savedEditor);
    };

    /* ── Select a function ─────────────────────────────────────────── */
    const selectFunction = (fnName) => {
        ensureTimerRunning();
        const scopeEditorsSnapshot = buildScopeEditorsSnapshot();
        setScopeEditors(scopeEditorsSnapshot);

        const fnHeader   = functionHeaders[fnName];
        const scopeToken = fnHeader?.scope_id ?? fnName;

        const newPath   = [scopeToken];
        const newLabels = [fnName];
        setScopePath(newPath);
        setScopeLabels(newLabels);

        const newKey = scopeKey(newPath);
        const saved  = scopeEditorsSnapshot[newKey] || [];
        loadScopeView(newPath, saved);
    };

    /* ── Load scope view (bank + editor) ───────────────────────────── */
    const loadScopeView = (path, savedEditor) => {
        if (path.length === 0) {
            setEditorBlocks([]);
            setBankBlocks([]);
            return;
        }

        const scopeBlocksAll = getScopeBlocks(path);
        const placedIds      = new Set(savedEditor.map(b => b.block_id));
        const bankItems      = scopeBlocksAll.filter(b => !placedIds.has(b.block_id));

        setEditorBlocks(savedEditor);
        setBankBlocks(bankItems);
    };

    /* ── Get all blocks belonging to a scope path ──────────────────── */
    const getScopeBlocks = (path) => {
        if (path.length === 0) return [];

        if (path.length === 1) {
            const scopeToken = path[0];
            const fnEntry = Object.entries(functionHeaders).find(
                ([, hdr]) => hdr?.scope_id === scopeToken
            );
            const fnName      = fnEntry ? fnEntry[0] : scopeToken;
            const fnHdrScopeId = functionHeaders[fnName]?.scope_id ?? null;
            return allBlocks.filter(b =>
                b.function_name === fnName && b.parent_scope_id === fnHdrScopeId
            );
        }

        const parentId = path[path.length - 1];
        return allBlocks.filter(b => b.parent_scope_id === parentId);
    };

    /* ── Submit readiness ──────────────────────────────────────────── */
    const totalPlaced = () => {
        let count = 0;
        for (const arr of Object.values(scopeEditors)) count += arr.length;
        count += editorBlocks.length;
        return count;
    };

    /* ── Function done status ──────────────────────────────────────── */
    // Returns: 'complete' | 'in-progress' | 'not-started'
    // A function is only 'complete' when EVERY block at EVERY nesting level
    // (top-level + all nested loop bodies + blocks in the pending loop stack) is placed.
    const functionDoneStatus = () => {
        const status = {};
        const isInThisFn = (tok) => scopePath.length > 0 && scopePath[0] === tok;

        // Build a set of ALL currently-placed block IDs across the entire session.
        // 1. From saved scope editors
        const savedPlacedIds = new Set();
        for (const arr of Object.values(scopeEditors)) {
            arr.forEach(b => savedPlacedIds.add(b.block_id));
        }
        // 2. From live editor (not yet saved to scopeEditors for this scope)
        editorBlocks.forEach(b => savedPlacedIds.add(b.block_id));
        // 3. From blocks sitting in pendingLoopStack (dragged into editor,
        //    temporarily removed while the user arranges the loop body)
        for (const { block } of pendingLoopStack) {
            savedPlacedIds.add(block.block_id);
        }

        for (const fn of functions) {
            const hdrs = functionHeaders[fn];
            const tok  = hdrs?.scope_id ?? fn;

            // All blocks that belong to this function at any nesting depth
            const fnBlocks = allBlocks.filter(b => b.function_name === fn);
            const total    = fnBlocks.length;
            const placed   = fnBlocks.filter(b => savedPlacedIds.has(b.block_id)).length;

            if (total > 0 && placed >= total) {
                status[fn] = 'complete';
            } else if (placed > 0) {
                status[fn] = 'in-progress';
            } else {
                status[fn] = 'not-started';
            }
        }
        return status;
    };




    /* ── Reset current scope ───────────────────────────────────────── */
    const handleReset = () => {
        ensureTimerRunning();
        const scopeBlocks = getScopeBlocks(scopePath);
        setBankBlocks(scopeBlocks);
        setEditorBlocks([]);
        const key = scopeKey(scopePath);
        setScopeEditors(prev => ({ ...prev, [key]: [] }));
    };

    /* ── Submit ────────────────────────────────────────────────────── */
    const handleSubmit = async () => {
        if (!attemptId) return;
        setSubmitting(true);

        const key = scopeKey(scopePath);
        const finalScopeEditors = { ...scopeEditors, [key]: editorBlocks };

        try {
            const finalElapsedSeconds = stopTimer();
            const allPlaced = [];
            for (const arr of Object.values(finalScopeEditors)) {
                allPlaced.push(...arr);
            }
            allPlaced.sort((a, b) => (a.correct_position ?? 0) - (b.correct_position ?? 0));

            await attemptAPI.submit(attemptId, {
                submitted_order: allPlaced.map(b => b.block_id),
                time_taken_sec: finalElapsedSeconds,
            });
            // Clear persisted state now that the attempt is submitted
            localStorage.removeItem(`parsons_state_${assignmentId}`);
            setPendingLoopStack([]);
            setElapsedSeconds(finalElapsedSeconds);
            navigate(`/student/result/${attemptId}`);
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit attempt');
        } finally {
            setSubmitting(false);
        }
    };

    /* ────────────────────────────────────────────────────────────────────── */
    /*  DnD handlers                                                           */
    /* ────────────────────────────────────────────────────────────────────── */
    const findContainer = (id) => {
        if (id === 'editor' || id === 'bank') return id;
        if (editorRef.current.some(b => b.block_id === id)) return 'editor';
        if (bankRef.current.some(b  => b.block_id === id)) return 'bank';
        return null;
    };

    const handleDragStart = ({ active }) => {
        ensureTimerRunning();
        const all = [...editorRef.current, ...bankRef.current];
        setActiveBlock(all.find(b => b.block_id === active.id) ?? null);
    };

    const handleDragOver = ({ active, over }) => {
        if (!over) return;
        const fromContainer = findContainer(active.id);
        const toContainer   = findContainer(over.id);
        if (!fromContainer || !toContainer || fromContainer === toContainer) return;

        setEditorBlocks(editor => {
            const newEditor = [...editor];
            setBankBlocks(bank => {
                const newBank = [...bank];
                const fromList = fromContainer === 'editor' ? newEditor : newBank;
                const toList   = toContainer   === 'editor' ? newEditor : newBank;
                const activeIdx = fromList.findIndex(b => b.block_id === active.id);
                if (activeIdx === -1) return bank;
                const [movedBlock] = fromList.splice(activeIdx, 1);
                const overIdx = toList.findIndex(b => b.block_id === over.id);
                const insertAt = overIdx >= 0 ? overIdx : toList.length;
                toList.splice(insertAt, 0, movedBlock);
                return [...newBank];
            });
            return [...newEditor];
        });
    };

    const handleDragEnd = ({ active, over }) => {
        setActiveBlock(null);
        if (!over) return;

        const container     = findContainer(active.id);
        const overContainer = findContainer(over.id);

        // ── Intercept: loop-header dropped into editor ────────────────
        // Redirect the student to arrange the loop body first.
        // The header auto-places when they click "Done".
        const block = [...editorRef.current, ...bankRef.current].find(
            b => b.block_id === active.id
        );
        if (
            overContainer === 'editor' &&
            block?.is_scope_header &&
            block?.scope_type?.includes('loop') &&
            block?.scope_id
        ) {
            // Record the position where it landed
            const insertIdx       = editorRef.current.findIndex(b => b.block_id === active.id);
            const editorWithoutLoop = editorRef.current.filter(b => b.block_id !== active.id);

            // Save pending loop on the stack
            setPendingLoopStack(prev => [
                ...prev,
                { block, insertIdx: Math.max(0, insertIdx) },
            ]);

            // Navigate into loop scope, overriding the saved current editor
            // so we don't save the loop header in the parent scope
            const newPath   = [...scopePath, block.scope_id];
            const newLabels = [...scopeLabels, block.text.trim().slice(0, 35) + '…'];
            navigateToScope(newPath, newLabels, editorWithoutLoop);
            return;
        }

        // ── Normal same-container reorder ─────────────────────────────
        if (container && container === overContainer && active.id !== over.id) {
            if (container === 'editor') {
                setEditorBlocks(items => {
                    const oldIdx = items.findIndex(b => b.block_id === active.id);
                    const newIdx = items.findIndex(b => b.block_id === over.id);
                    return newIdx >= 0 ? arrayMove(items, oldIdx, newIdx) : items;
                });
            } else {
                setBankBlocks(items => {
                    const oldIdx = items.findIndex(b => b.block_id === active.id);
                    const newIdx = items.findIndex(b => b.block_id === over.id);
                    return newIdx >= 0 ? arrayMove(items, oldIdx, newIdx) : items;
                });
            }
        }
    };

    /* ────────────────────────────────────────────────────────────────────── */
    /*  Render helpers                                                         */
    /* ────────────────────────────────────────────────────────────────────── */

    const doneSt         = functionDoneStatus();
    const completedCount = Object.values(doneSt).filter(s => s === 'complete').length;

    if (loading) return (
        <div className="page-container">
            <div className="text-secondary">Loading puzzle…</div>
        </div>
    );

    const deadlineAlert = (() => {
        if (!assignment) return null;
        const hrs = (new Date(assignment.end_at) - Date.now()) / 3_600_000;
        if (hrs > 0 && hrs <= 24) {
            const h = Math.floor(hrs);
            const m = Math.floor((hrs - h) * 60);
            return <div className="alert alert-warning" style={{ flexShrink: 0 }}>⚠️ Deadline: {h}h {m}m remaining</div>;
        }
        return null;
    })();

    /* ── "Done with loop body" banner ──────────────────────────────── */
    const renderLoopDoneBanner = () => {
        if (scopePath.length < 2 || pendingLoopStack.length === 0) return null;
        const { block: loopBlock } = pendingLoopStack[pendingLoopStack.length - 1];
        return (
            <div className="loop-done-banner">
                <Repeat size={15} />
                <span>
                    Arranging body of:{' '}
                    <code>{loopBlock?.text?.trim().slice(0, 45)}{loopBlock?.text?.trim().length > 45 ? '…' : ''}</code>
                </span>
                <button className="btn btn-success btn-sm" onClick={goBack}>
                    <ArrowLeftCircle size={14} /> Done — place loop in editor
                </button>
            </div>
        );
    };

    /* ── Breadcrumb ─────────────────────────────────────────────────── */
    const renderBreadcrumb = () => {
        if (scopePath.length === 0) return null;
        return (
            <div className="scope-breadcrumb">
                <button className="breadcrumb-back" onClick={goBack}>
                    <ChevronLeft size={14} /> Back
                </button>
                <span className="breadcrumb-sep">›</span>
                {scopeLabels.map((label, i) => (
                    <span key={i} className={`breadcrumb-item ${i === scopeLabels.length - 1 ? 'active' : ''}`}>
                        {i > 0 && <span className="breadcrumb-sep">›</span>}
                        {label}
                    </span>
                ))}
            </div>
        );
    };

    /* ── Function landing ───────────────────────────────────────────── */
    const renderFunctionLanding = () => (
        <div className="function-landing">
            <div className="landing-header">
                <FunctionSquare size={22} />
                <h2>Choose a function to arrange</h2>
                <p className="text-secondary">Each function's lines are arranged separately, then submitted together.</p>
            </div>
            <div className="function-grid">
                {functions.map(fn => (
                    <button
                        key={fn}
                        className={`function-card ${doneSt[fn]} ${!hasActiveAttempt ? 'locked' : ''}`}
                        onClick={() => hasActiveAttempt && selectFunction(fn)}
                        disabled={!hasActiveAttempt}
                    >
                        <div className="fn-card-icon">
                            <FunctionSquare size={20} />
                            {doneSt[fn] === 'complete' && <CheckCircle2 size={14} className="done-badge" />}
                            {doneSt[fn] === 'in-progress' && <CircleDashed size={14} className="progress-badge" />}
                        </div>
                        <span className="fn-name">{fn}()</span>
                        <ChevronRight size={16} className="fn-arrow" />
                    </button>
                ))}
            </div>
            <div className="function-progress-row">
                <span>{completedCount} / {functions.length} functions complete</span>
                <div className="function-progress-bar">
                    <div
                        className="function-progress-fill"
                        style={{ width: `${functions.length ? (completedCount / functions.length) * 100 : 0}%` }}
                    />
                </div>
            </div>
            <div className="landing-submit-hint">
                When you're done arranging all functions, click <strong>Submit</strong> above.
            </div>
        </div>
    );

    /* ── Context header (inside a loop) ────────────────────────────── */
    const renderContextHeader = () => {
        if (scopePath.length < 2) return null;
        const parentScopeId = scopePath[scopePath.length - 1];
        const loopHeader    = allBlocks.find(b => b.scope_id === parentScopeId);
        if (!loopHeader) return null;
        return (
            <div className="loop-context-header">
                <Repeat size={14} />
                <span>Arranging body of: </span>
                <code>{loopHeader.text.trim()}</code>
            </div>
        );
    };

    /* ── Bank drill button ──────────────────────────────────────────── */
    // Helper: true only if the loop actually has arrangeable child blocks
    const loopHasChildren = (block) =>
        allBlocks.some(b => b.parent_scope_id === block.scope_id);

    const renderDrillButton = (block) => {
        if (!block.is_scope_header || !block.scope_type?.includes('loop')) return null;
        if (!loopHasChildren(block)) return null;   // single-line loop — nothing to arrange
        const label = block.scope_type === 'for_loop' ? 'for loop' : 'while loop';
        return (
            <button
                className="drill-btn"
                title={`Arrange lines inside this ${label}`}
                onClick={(e) => {
                    e.stopPropagation();
                    enterScope(block.scope_id, block.text.trim().slice(0, 30) + '…');
                }}
            >
                <ChevronRight size={12} /> Inside
            </button>
        );
    };


    /* ── Inline loop body preview (read-only, inside editor) ────────── */
    const renderLoopBodyPreview = (loopBlock, depth = 0, parentPath = scopePath, parentLabels = scopeLabels) => {
        // If this loop has no child blocks at all, nothing to show
        if (!loopHasChildren(loopBlock)) return null;

        // Build the FULL path and labels for this loop
        const childPath   = [...parentPath, loopBlock.scope_id];
        const childLabels = [...parentLabels, loopBlock.text.trim().slice(0, 35) + '…'];
        const bodyKey     = scopeKey(childPath);
        const bodyBlocks  = scopeEditors[bodyKey] || [];

        if (bodyBlocks.length === 0) {
            // Child blocks exist but haven't been arranged yet
            return (
                <div className="loop-body-empty-prompt">
                    <span>⚠️ Loop body not arranged yet.</span>
                    <button
                        className="drill-btn"
                        onClick={() => navigateToScope(childPath, childLabels)}
                    >
                        <ChevronRight size={11} /> Arrange body
                    </button>
                </div>
            );
        }

        return (
            <div className={`loop-body-inline${depth > 0 ? ' nested' : ''}`}>
                {bodyBlocks.map(bb => (
                    <div key={bb.block_id} className="loop-body-block">
                        <code>{bb.text}</code>
                        {/* Recurse for nested loops — pass the accumulated childPath and labels */}
                        {bb.is_scope_header && bb.scope_type?.includes('loop') && bb.scope_id &&
                            renderLoopBodyPreview(bb, depth + 1, childPath, childLabels)
                        }
                    </div>
                ))}
            </div>
        );
    };


    /* ── DnD panel ──────────────────────────────────────────────────── */
    const renderDndPanel = () => (
        <>
        {/* Font size slider row */}
        <div className="panel-resize-controls">
            <label className="resize-label">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><text x="2" y="18" fontFamily="monospace" fontSize="14" fill="currentColor" stroke="none">A</text></svg>
                Font size
            </label>
            <input
                type="range"
                min="10"
                max="20"
                step="1"
                value={blockFontSize}
                onChange={e => setBlockFontSize(Number(e.target.value))}
                className="font-size-slider"
                title={`Block font size: ${blockFontSize}px`}
            />
            <span className="resize-value">{blockFontSize}px</span>
        </div>
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div
                ref={layoutRef}
                className={`puzzle-editor-layout${!hasActiveAttempt ? ' locked' : ''}`}
                style={{ gridTemplateColumns: `${editorWidthPct}% 6px 1fr` }}
            >

                {/* LEFT – Code Editor */}
                <div className="editor-panel card">
                    <div className="panel-header">
                        <Code2 size={16} />
                        <span>Code Editor</span>
                        <span className="panel-hint">Drop blocks here to arrange your solution</span>
                    </div>
                    <SortableContext
                        items={editorBlocks.map(b => b.block_id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <DroppablePanel id="editor" className="editor-drop-zone">
                            {editorBlocks.length === 0 ? (
                                <div className="editor-empty-hint">
                                    <Layers size={34} opacity={0.25} />
                                    <p>Drag blocks from the right panel to build your solution here.</p>
                                </div>
                            ) : (
                                editorBlocks.map((block, idx) => {
                                    // Only treat as a drillable loop header if it actually has child blocks
                                    const isLoopHeader = block.is_scope_header && block.scope_type?.includes('loop') && block.scope_id && loopHasChildren(block);
                                    return (
                                        <div key={block.block_id} className="editor-block-with-body">
                                            <div className="editor-block-row">
                                                <DraggableBlock
                                                    id={block.block_id}
                                                    text={block.text}
                                                    index={idx}
                                                    variant="editor"
                                                    fontSize={blockFontSize}
                                                />
                                                {/* Allow re-editing loop body after it's placed */}
                                                {isLoopHeader && (
                                                    <button
                                                        className="drill-btn edit-loop-btn"
                                                        title="Re-arrange loop body"
                                                        onClick={() => enterScope(block.scope_id, block.text.trim().slice(0, 35) + '…')}
                                                    >
                                                        <Repeat size={11} />{' '}
                                                        {(scopeEditors[scopeKey([...scopePath, block.scope_id])] || []).length > 0 ? 'Edit' : 'Enter'}
                                                    </button>
                                                )}
                                            </div>
                                            {/* Inline body preview */}
                                            {isLoopHeader && renderLoopBodyPreview(block)}
                                        </div>
                                    );
                                })
                            )}
                        </DroppablePanel>
                    </SortableContext>
                </div>

                {/* DIVIDER */}
                <div
                    className="panel-divider"
                    onMouseDown={handleDividerMouseDown}
                    title="Drag to resize panels"
                />

                {/* RIGHT – Block Bank */}
                <div className="bank-panel card">
                    <div className="panel-header">
                        <Layers size={16} />
                        <span>Blocks</span>
                        <span className="panel-badge">{bankBlocks.length} left</span>
                    </div>
                    <SortableContext
                        items={bankBlocks.map(b => b.block_id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <DroppablePanel id="bank" className="bank-drop-zone">
                            {bankBlocks.length === 0 ? (
                                <div className="bank-empty-hint">
                                    <span>All blocks placed! 🎉</span>
                                    {scopePath.length > 0 && (
                                        <button
                                            className="btn-go-back-loop"
                                            onClick={goBack}
                                            title={scopePath.length > 1 ? "Return to parent scope" : "Return to function list"}
                                        >
                                            <ArrowLeftCircle size={15} />
                                            {pendingLoopStack.length > 0
                                                ? 'Done — place loop in editor'
                                                : 'Done — go back'}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                bankBlocks.map(block => (
                                    <div key={block.block_id} className="bank-block-row">
                                        <DraggableBlock
                                            id={block.block_id}
                                            text={block.text}
                                            variant="bank"
                                            fontSize={blockFontSize}
                                        />
                                        {renderDrillButton(block)}
                                    </div>
                                ))
                            )}
                        </DroppablePanel>
                    </SortableContext>
                </div>
            </div>

            <DragOverlay>
                {activeBlock && (
                    <DraggableBlock
                        id={activeBlock.block_id}
                        text={activeBlock.text}
                        variant="overlay"
                        fontSize={blockFontSize}
                    />
                )}
            </DragOverlay>
        </DndContext>
        </>
    );

    /* ── Main render ────────────────────────────────────────────────── */
    return (
        <div className="page-container solve-page">

            {/* Top bar */}
            <div className="puzzle-solve-header">
                <div>
                    <h1>{puzzle?.title || 'Puzzle'}</h1>
                    <p className="text-secondary">{puzzle?.description}</p>
                </div>
                <div className="solve-header-right">
                    <div className="puzzle-timer">
                        <Clock size={16} />
                        <span>{elapsed}</span>
                    </div>
                    {scopePath.length > 0 && (
                        <button onClick={handleReset} className="btn btn-secondary" disabled={!hasActiveAttempt}>
                            <RotateCcw size={15} /> Reset
                        </button>
                    )}
                    <button
                        onClick={handleSubmit}
                        className="btn btn-primary"
                        disabled={submitting || !hasActiveAttempt || totalPlaced() === 0}
                    >
                        <Send size={15} />
                        {submitting ? 'Submitting…' : 'Submit'}
                    </button>
                </div>
            </div>

            {error && <div className="alert alert-error" style={{ flexShrink: 0 }}>{error}</div>}
            {deadlineAlert}

            {/* Function chip bar */}
            {functions.length > 0 && (
                <div className="function-chip-bar">
                    {functions.map(fn => {
                        const hdrs    = functionHeaders[fn];
                        const tok     = hdrs?.scope_id ?? fn;
                        const isActive = scopePath[0] === tok;
                        return (
                            <button
                                key={fn}
                                className={`fn-chip ${isActive ? 'active' : ''} ${doneSt[fn] === 'complete' ? 'completed' : ''} ${doneSt[fn] === 'in-progress' ? 'in-progress' : ''}`}
                                onClick={() => {
                                    const key = scopeKey(scopePath);
                                    setScopeEditors(prev => ({ ...prev, [key]: editorBlocks }));
                                    selectFunction(fn);
                                }}
                            >
                                {doneSt[fn] === 'complete' && <CheckCircle2 size={11} />}
                                {doneSt[fn] === 'in-progress' && <CircleDashed size={11} />}
                                {fn}()
                            </button>
                        );
                    })}
                </div>
            )}

            {/* Breadcrumb */}
            {renderBreadcrumb()}

            {/* "Done with loop body" banner — shown while arranging a pending loop */}
            {renderLoopDoneBanner()}

            {/* Context header (inside loop scope) */}
            {renderContextHeader()}

            {/* Main content */}
            {scopePath.length === 0
                ? renderFunctionLanding()
                : renderDndPanel()
            }

            {/* Start modal */}
            {showStartModal && (
                <div className="start-overlay">
                    <div className="start-modal card">
                        <h2>Ready to Start?</h2>
                        <p>You have a limited number of attempts. The timer starts when you begin.</p>
                        <button onClick={handleStartAttempt} className="btn btn-primary btn-lg">
                            Start Attempt
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
