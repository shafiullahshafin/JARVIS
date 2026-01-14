import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface Message {
    role: "user" | "assistant";
    content: string;
    id: string;
}

interface BubbleProps {
    message: Message;
}

// Renders a single chat bubble for either the user or the assistant
const Bubble = ({ message }: BubbleProps) => {
    const { content, role } = message;
    
    return (
        <div className={`${role} bubble`}>
            {role === 'assistant' ? (
                <div className="markdown-content">
                    <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                    >
                        {content}
                    </ReactMarkdown>
                </div>
            ) : (
                <p>{content}</p>
            )}
        </div>
    );
}

export default Bubble;
