import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

export default function ThemeSelect({
    id,
    name,
    value,
    options,
    onChange,
    placeholder = 'Select an option',
    disabled = false,
}) {
    const [isOpen, setIsOpen] = useState(false);
    const rootRef = useRef(null);

    const selectedOption = useMemo(
        () => options.find((option) => option.value === value),
        [options, value]
    );

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (!rootRef.current?.contains(event.target)) {
                setIsOpen(false);
            }
        };

        const handleEscape = (event) => {
            if (event.key === 'Escape') {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, []);

    const handleSelect = (nextValue) => {
        onChange({
            target: {
                name,
                value: nextValue,
            },
        });
        setIsOpen(false);
    };

    return (
        <div
            ref={rootRef}
            className={`theme-select${isOpen ? ' open' : ''}${disabled ? ' disabled' : ''}`}
        >
            <button
                id={id}
                type="button"
                className="theme-select-trigger"
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls={`${id}-listbox`}
                onClick={() => !disabled && setIsOpen((prev) => !prev)}
                disabled={disabled}
            >
                <span className={`theme-select-value${selectedOption ? '' : ' placeholder'}`}>
                    {selectedOption?.label || placeholder}
                </span>
                <ChevronDown size={18} className="theme-select-icon" />
            </button>

            <input type="hidden" name={name} value={value ?? ''} />

            {isOpen && (
                <div className="theme-select-menu" role="presentation">
                    <ul
                        id={`${id}-listbox`}
                        className="theme-select-list"
                        role="listbox"
                        aria-labelledby={id}
                    >
                        {options.map((option) => {
                            const isSelected = option.value === value;

                            return (
                                <li key={option.value} role="presentation">
                                    <button
                                        type="button"
                                        className={`theme-select-option${isSelected ? ' selected' : ''}`}
                                        role="option"
                                        aria-selected={isSelected}
                                        onClick={() => handleSelect(option.value)}
                                    >
                                        {option.label}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
    );
}
