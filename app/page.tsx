"use client";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import JARVIS from "./assets/logo_white.png";
import Bubble from "./components/Bubble";
import LoadingBubble from "./components/LoadingBubble";
import PromptSuggestionRow from "./components/PromptSuggestionRow";

interface Message {
  role: "user" | "assistant";
  content: string;
  id: string;
}

const Home = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const noMessages = messages.length === 0;

  // Keeps the chat view scrolled to the most recent message
  useEffect(() => {
    if (sectionRef.current) {
      sectionRef.current.scrollTop = sectionRef.current.scrollHeight;
    }
  }, [messages]);

  // Sends a user message and streams the assistant response
  const sendMessage = async (content: string) => {
    const userMessage: Message = { role: "user", content, id: Date.now().toString() };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const recentMessages = [...messages, userMessage].slice(-10);
      
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          messages: recentMessages.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });

      if (!response.ok) throw new Error(`API request failed with status: ${response.status}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const assistantMessage: Message = { role: "assistant", content: "", id: (Date.now() + 1).toString() };
      
      setMessages(prev => [...prev, assistantMessage]);

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const text = decoder.decode(value);
          assistantMessage.content += text;
          
          setMessages(prev => {
            const updated = [...prev];
            updated[updated.length - 1] = { ...assistantMessage };
            return updated;
          });
        }
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // Sends a selected prompt suggestion as a user message
  const handlePrompt = async (promptText: string) => {
    await sendMessage(promptText);
  };

  // Handles the chat form submission from the input box
  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!inputText.trim()) return;

    await sendMessage(inputText);
    setInputText("");
  };

  return (
    <main>
      <Image 
        src={JARVIS} 
        width={170} 
        height={42} 
        alt="Jarvis Logo" 
        style={{ marginTop: "-70px" }} 
      />

      <section ref={sectionRef} className={noMessages ? "" : "populated"}>
        {noMessages ? (
          <>
            <p className="starter-text" style={{ fontWeight: 600, color: 'white'}}>
              Ask me anything about Data Structures, Algorithms, Web Development, Research, and beyond...
            </p>
            <br />
            <PromptSuggestionRow onPromptClick={handlePrompt} />
          </>
        ) : (
          <>
            {messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))}
            {isLoading && <LoadingBubble />}
          </>
        )}
      </section>

      <form onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          className="question-box"
          placeholder="Ask me something..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          disabled={isLoading}
        />
        <input type="submit" value="Submit" disabled={isLoading} />
      </form>
    </main>
  );
};

export default Home;
