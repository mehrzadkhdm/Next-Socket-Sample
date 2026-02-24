"use client";

import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import {
  Box,
  Button,
  Input,
  Text,
  VStack,
  HStack,
  Badge,
  Heading,
  Container,
  Card,
  Separator,
  For,
} from "@chakra-ui/react";

// sessionStorage is tab-scoped: each tab has its own independent user session
const STORAGE_KEY = "socket_user_id";

export default function Home() {
  const [userId, setUserId] = useState("");
  const [inputValue, setInputValue] = useState("");
  const [users, setUsers] = useState<string[]>([]);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const socketRef = useRef<Socket | null>(null);

  const connectUser = async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) return;

    setConnecting(true);

    // Register the user via REST API before opening the socket
    try {
      const res = await fetch(`/api/users/${encodeURIComponent(trimmed)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!res.ok) {
        console.error("Failed to register user via API", await res.text());
        setConnecting(false);
        return;
      }
    } catch (err) {
      console.error("API error:", err);
      setConnecting(false);
      return;
    }

    if (!socketRef.current) {
      socketRef.current = io(window.location.origin);

      socketRef.current.on("connect", () => {
        setConnected(true);
        setConnecting(false);
        setUserId(trimmed);
        setInputValue(trimmed);
        sessionStorage.setItem(STORAGE_KEY, trimmed); // persist
        socketRef.current!.emit("register", trimmed);
      });

      socketRef.current.on("users", (userList: string[]) => {
        setUsers(userList);
      });

      socketRef.current.on("disconnect", () => {
        setConnected(false);
        setUsers([]);
      });

      socketRef.current.on("connect_error", () => {
        setConnecting(false);
      });
    } else {
      setUserId(trimmed);
      setInputValue(trimmed);
      sessionStorage.setItem(STORAGE_KEY, trimmed); // persist
      socketRef.current.emit("register", trimmed);
      setConnecting(false);
    }
  };

  const handleConnect = () => connectUser(inputValue);

  const handleDisconnect = async () => {
    // Remove user from the API store
    if (userId) {
      try {
        await fetch(`/api/users/${encodeURIComponent(userId)}`, {
          method: "DELETE",
        });
      } catch (err) {
        console.error("API error on disconnect:", err);
      }
    }

    sessionStorage.removeItem(STORAGE_KEY); // clear persisted state

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
    setConnected(false);
    setUserId("");
    setInputValue("");
    setUsers([]);
  };

  return (
    <Box minH="100vh" bg="gray.50" py={12}>
      <Container maxW="lg">
        <VStack gap={8} align="stretch">
          <VStack gap={2} textAlign="center">
            <Heading size="2xl" color="teal.600">
              Socket.IO Live Users
            </Heading>
            <Text color="gray.500" fontSize="md">
              Enter your ID to join and see who is connected
            </Text>
          </VStack>

          <Card.Root shadow="md" borderRadius="xl">
            <Card.Body p={6}>
              <VStack gap={4} align="stretch">
                <HStack gap={3}>
                  <Input
                    placeholder="Enter your user ID"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !connected) handleConnect();
                    }}
                    disabled={connected}
                    size="lg"
                    _focus={{ borderColor: "teal.500" }}
                  />
                  {!connected ? (
                    <Button
                      colorPalette="teal"
                      size="lg"
                      onClick={handleConnect}
                      loading={connecting}
                      loadingText="Connecting..."
                      disabled={!inputValue.trim()}
                      px={8}
                    >
                      Connect
                    </Button>
                  ) : (
                    <Button
                      colorPalette="red"
                      variant="outline"
                      size="lg"
                      onClick={handleDisconnect}
                      px={8}
                    >
                      Disconnect
                    </Button>
                  )}
                </HStack>

                <HStack gap={2}>
                  <Box
                    w={3}
                    h={3}
                    borderRadius="full"
                    bg={connected ? "green.400" : "gray.300"}
                  />
                  <Text fontSize="sm" color={connected ? "green.600" : "gray.400"}>
                    {connected ? `Connected as "${userId}"` : "Not connected"}
                  </Text>
                </HStack>
              </VStack>
            </Card.Body>
          </Card.Root>

          <Card.Root shadow="md" borderRadius="xl">
            <Card.Body p={6}>
              <VStack gap={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md" color="gray.700">
                    Connected Users
                  </Heading>
                  <Badge colorPalette="teal" fontSize="sm" px={3} py={1} borderRadius="full">
                    {users.length} online
                  </Badge>
                </HStack>

                <Separator />

                {users.length === 0 ? (
                  <Box py={8} textAlign="center">
                    <Text color="gray.400" fontSize="md">
                      No users connected yet
                    </Text>
                  </Box>
                ) : (
                  <VStack gap={2} align="stretch">
                    <For each={users}>
                      {(user, index) => (
                        <HStack
                          key={index}
                          p={3}
                          bg={user === userId ? "teal.50" : "gray.50"}
                          borderRadius="lg"
                          border="1px solid"
                          borderColor={user === userId ? "teal.200" : "gray.200"}
                          gap={3}
                        >
                          <Box
                            w={8}
                            h={8}
                            borderRadius="full"
                            bg={user === userId ? "teal.500" : "gray.400"}
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text color="white" fontSize="sm" fontWeight="bold">
                              {user.charAt(0).toUpperCase()}
                            </Text>
                          </Box>
                          <Text
                            fontWeight={user === userId ? "bold" : "normal"}
                            color={user === userId ? "teal.700" : "gray.700"}
                          >
                            {user}
                          </Text>
                          {user === userId && (
                            <Badge colorPalette="teal" ml="auto" fontSize="xs">
                              You
                            </Badge>
                          )}
                        </HStack>
                      )}
                    </For>
                  </VStack>
                )}
              </VStack>
            </Card.Body>
          </Card.Root>
        </VStack>
      </Container>
    </Box>
  );
}
