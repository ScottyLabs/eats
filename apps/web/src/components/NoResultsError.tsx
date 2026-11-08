import { Button } from '@mui/material';

function EateryCard({ onClear }: { onClear: () => unknown }) {
    return (
        <div className="error-container">
            <h3 className="error-container__title">No results found</h3>
            <p className="error-container__text">
                Try searching for a name (e.g. &quot;Schatz&quot;) or location (e.g. &quot;Cohon&quot;).
            </p>
            <Button onClick={onClear} className="error-container__error-button">
                Clear search
            </Button>
        </div>
    );
}

export default EateryCard;
