"use client";

import { useState, useEffect, useRef } from "react";
import {
    Box,
    Button,
    Input,
    VStack,
    HStack,
    Text,
    Card,
    CloseButton,
    Textarea,
} from "@chakra-ui/react";

export interface ChatMessage {
    id?: string;
    from: string;
    text: string;
    timestamp: number;
}

interface ChatWindowProps {
    userId: string;
    otherUserId: string;
    messages: ChatMessage[];
    onClose: () => void;
    onSendMessage: (text: string) => void;
    position?: number; // Position index from right (0 = rightmost)
}

export function ChatWindow({
    userId,
    otherUserId,
    messages,
    onClose,
    onSendMessage,
    position = 0,
}: ChatWindowProps) {
    const [inputValue, setInputValue] = useState("");
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    // Scroll to the latest message whenever count changes (send/receive)
    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;

        container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
        });
    }, [messages.length]);

    const handleSendMessage = () => {
        if (inputValue.trim()) {
            onSendMessage(inputValue);
            setInputValue("");
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const rightPosition = position * 320 + 16; // 320px width + 16px gap

    return (
        <Box
            position="fixed"
            bottom={4}
            right={`${rightPosition}px`}
            w="300px"
            h="400px"
            display="flex"
            flexDirection="column"
            zIndex={1000 - position} // Higher z-index for leftmost chats
        >
            <Card.Root
                shadow="lg"
                borderRadius="lg"
                border="1px solid"
                borderColor="gray.200"
                h="100%"
                display="flex"
                flexDirection="column"
                bg="white"
            >
                {/* Header */}
                <HStack
                    justify="space-between"
                    align="center"
                    p={3}
                    borderBottom="1px solid"
                    borderColor="gray.200"
                    bg="teal.50"
                    flexShrink={0}
                >
                    <Text fontWeight="bold" fontSize="sm" color="gray.800">
                        {otherUserId}
                    </Text>
                    <CloseButton size="sm" onClick={onClose} />
                </HStack>

                {/* Messages Container */}
                <VStack
                    ref={messagesContainerRef}
                    flex={1}
                    overflowY="auto"
                    p={3}
                    gap={2}
                    align="stretch"
                    css={{
                        "&::-webkit-scrollbar": {
                            width: "6px",
                        },
                        "&::-webkit-scrollbar-track": {
                            background: "#f1f1f1",
                        },
                        "&::-webkit-scrollbar-thumb": {
                            background: "#bbb",
                            borderRadius: "3px",
                        },
                    }}
                >
                    {messages.length === 0 ? (
                        <Box textAlign="center" py={8}>
                            <Text fontSize="xs" color="gray.400">
                                No messages yet
                            </Text>
                        </Box>
                    ) : (
                        messages.map((msg, idx) => {
                            const isOwn = msg.from === userId;
                            return (
                                <HStack
                                    key={msg.id ?? idx}
                                    justify={isOwn ? "flex-end" : "flex-start"}
                                    w="100%"
                                >
                                    <Box
                                        maxW="80%"
                                        p={2}
                                        borderRadius="md"
                                        bg={isOwn ? "teal.100" : "gray.100"}
                                        textAlign={isOwn ? "right" : "left"}
                                    >
                                        <Text fontSize="xs" color="gray.600" mb={1}>
                                            {isOwn ? "You" : msg.from}
                                        </Text>
                                        <Text fontSize="sm" color="gray.800" whiteSpace="pre-wrap">
                                            {msg.text}
                                        </Text>
                                        <Text fontSize="xs" color="gray.500" mt={1}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </Text>
                                    </Box>
                                </HStack>
                            );
                        })
                    )}
                </VStack>

                {/* Input Area */}
                <VStack
                    p={3}
                    gap={2}
                    borderTop="1px solid"
                    borderColor="gray.200"
                    flexShrink={0}
                >
                    <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Type message... (Shift+Enter for new line)"
                        size="sm"
                        resize="none"
                        rows={2}
                        maxH="60px"
                    />
                    <Button
                        colorPalette="teal"
                        size="sm"
                        w="100%"
                        onClick={handleSendMessage}
                        disabled={!inputValue.trim()}
                    >
                        Send
                    </Button>
                </VStack>
            </Card.Root>
        </Box>
    );
}
