import { CoreMessage } from "ai";
import { notFound } from "next/navigation";

import { auth } from "@/app/(auth)/auth";
import { Chat as PreviewChat } from "@/components/custom/chat";
import { getChatById } from "@/db/queries";
import { Chat } from "@/db/schema";
import { convertToUIMessages } from "@/lib/utils";

// Function to generate static paths for all chat pages
export async function generateStaticParams() {
  // Fetch all chats. Replace with your actual data fetching logic.
  // This could be a direct database call if your build environment supports it,
  // or an API call to an endpoint that lists all chat IDs.
  // Using the provided NEXT_PUBLIC_API_BASE_URL
  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "https://gemini-chatbot-linkeen.vercel.app"; // Fallback if env var is not set
  const response = await fetch(`${baseUrl}/api/chats`); // Ensure this API endpoint exists and returns chat IDs

  if (!response.ok) {
    // Handle error appropriately, e.g., return empty array or throw
    console.error(
      "Failed to fetch chats for generateStaticParams:",
      await response.text()
    );
    return [];
  }

  const chats = await response.json();

  // Ensure chats is an array and has the expected structure
  if (!Array.isArray(chats)) {
    console.error(
      "Invalid data format for chats in generateStaticParams:",
      chats
    );
    return [];
  }

  return chats.map((chat: { id: string }) => ({
    id: chat.id,
  }));
}

export default async function Page({ params }: { params: { id: string } }) {
  const { id } = params;
  const chatFromDb = await getChatById({ id });

  if (!chatFromDb) {
    notFound();
  }

  // type casting and converting messages to UI messages
  const chat: Chat = {
    ...chatFromDb,
    messages: convertToUIMessages(chatFromDb.messages as Array<CoreMessage>),
  };

  const session = await auth();

  if (!session || !session.user) {
    // If running with output: "export", auth() might not work as expected
    // during static generation for user-specific checks.
    // Consider if this page truly needs to be static if it's user-specific.
    return notFound();
  }

  if (session.user.id !== chat.userId) {
    return notFound();
  }

  return <PreviewChat id={chat.id} initialMessages={chat.messages} />;
}
