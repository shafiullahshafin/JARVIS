import "./global.css"

export const metadata = {
    title: "Jarvis",
    description: "Your AI assistant for Computer Science, Algorithms, Programming, and Research."
}

const RootLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <html lang="en"> 
            <body>{children}</body>
        </html>
    )
}

export default RootLayout;