interface PromptSuggestionButtonProps {
    text: string;
    onClick: () => void;
}

// Renders a clickable suggestion button with a sample prompt
const PromptSuggestionButton = ({ text, onClick }: PromptSuggestionButtonProps) => {
    return (
        <button 
            className="prompt-suggestion-button"
            onClick={onClick}
        >
            {text}
        </button>
    );
};

export default PromptSuggestionButton;
