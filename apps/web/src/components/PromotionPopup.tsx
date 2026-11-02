import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import css from './PromotionPopup.module.css';

export default function PromotionPopup({
    graphic,
    alt,
    locationName,
    onClose,
}: {
    graphic: string;
    alt: string;
    locationName: string;
    onClose: () => void;
}) {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const [imageFailed, setImageFailed] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;
        dialog?.showModal();
        return () => dialog?.close();
    }, []);

    return createPortal(
        // showModal manages focus and background interaction; these handlers dismiss the
        // popup on backdrop clicks and keep Escape from reaching the drawer.
        // oxlint-disable-next-line jsx_a11y/no-noninteractive-element-interactions
        <dialog
            ref={dialogRef}
            className={css.dialog}
            aria-label={`${locationName} promotion`}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            onKeyDown={(event) => {
                if (event.key === 'Escape') event.stopPropagation();
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget) onClose();
            }}
        >
            <div className={css.frame} data-scrollable>
                <span className={css.glow} aria-hidden="true" />
                <button type="button" className={css.close} aria-label="Close promotion" onClick={onClose}>
                    <X size={22} aria-hidden />
                </button>
                {imageFailed ? (
                    <output className={css.error}>
                        This promotion image couldn’t be loaded. Please try opening it again.
                    </output>
                ) : (
                    <img className={css.graphic} src={graphic} alt={alt} onError={() => setImageFailed(true)} />
                )}
            </div>
        </dialog>,
        document.body,
    );
}
