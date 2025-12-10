'use client'

import { useState, useEffect, useMemo } from 'react';
import PromptSuggestionButton from './PromptSuggestionButton';

interface PromptSuggestionRowProps {
    onPromptClick: (prompt: string) => void;
}

const PROMPT_CATEGORIES = {
    algorithms: [
        "What is the difference between a stack and a queue?",
        "Explain how binary search works with time complexity",
        "Compare quicksort and mergesort algorithms",
        "What is dynamic programming and when should I use it?",
        "Explain Dijkstra's shortest path algorithm"
    ],
    dataStructures: [
        "How does a hash table handle collisions?",
        "What are the advantages of a binary search tree?",
        "Explain the difference between array and linked list",
        "What is a heap and its applications?",
        "How does a trie data structure work?"
    ],
    oop: [
        "What are the key principles of object-oriented programming?",
        "Explain polymorphism with examples",
        "What is the difference between composition and inheritance?",
        "How do interfaces differ from abstract classes?",
        "What are design patterns and why use them?"
    ],
    webDev: [
        "What is the difference between REST and GraphQL?",
        "Explain how JWT authentication works",
        "What are React hooks and why use them?",
        "How does the event loop work in JavaScript?",
        "What is server-side rendering vs client-side rendering?"
    ],
    ai: [
        "What is the difference between supervised and unsupervised learning?",
        "Explain how neural networks work",
        "What is backpropagation in deep learning?",
        "How does gradient descent optimization work?",
        "What are transformers in NLP?"
    ]
} as const;

const PROMPTS_TO_DISPLAY = 4;

const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

const PromptSuggestionRow = ({ onPromptClick }: PromptSuggestionRowProps) => {
    const allPrompts = useMemo(
        () => Object.values(PROMPT_CATEGORIES).flat(),
        []
    );
    
    const defaultPrompts = useMemo(
        () => allPrompts.slice(0, PROMPTS_TO_DISPLAY),
        [allPrompts]
    );
    
    const [prompts, setPrompts] = useState<string[]>(defaultPrompts);
    const [isClient, setIsClient] = useState(false);
    
    useEffect(() => {
        setIsClient(true);
        const shuffled = shuffleArray(allPrompts);
        setPrompts(shuffled.slice(0, PROMPTS_TO_DISPLAY));
    }, [allPrompts]);
    
    const handlePromptClick = (prompt: string) => {
        try {
            onPromptClick(prompt);
        } catch (error) {
            console.error('Error handling prompt click:', error);
        }
    };
    
    return (
        <div className="prompt-suggestion-container">
            <div className="prompt-suggestion-row">
                {prompts.slice(0, 2).map((prompt, index) => (
                    <PromptSuggestionButton 
                        key={isClient ? `${prompt}-${index}` : `default-${index}`}
                        text={prompt}
                        onClick={() => handlePromptClick(prompt)}
                    />
                ))}
            </div>
            <div className="prompt-suggestion-row">
                {prompts.slice(2, 4).map((prompt, index) => (
                    <PromptSuggestionButton 
                        key={isClient ? `${prompt}-${index + 2}` : `default-${index + 2}`}
                        text={prompt}
                        onClick={() => handlePromptClick(prompt)}
                    />
                ))}
            </div>
        </div>
    );
};

export default PromptSuggestionRow;