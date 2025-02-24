"use client";

import React, { useState, useEffect, useRef } from "react";
import ReactQuill from "react-quill-new";
import type { RealtimeChannel } from "@supabase/supabase-js";

import "react-quill-new/dist/quill.snow.css";
import {
  updateDocument,
  deleteDocument,
  getDocument,
} from "../actions/documents";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Trash2, Share2 } from "lucide-react";
import ShareDialog from "./ShareDialog";
import UserCursor from "./UserCursor";
import type { UserPresence, DocumentPresence } from "@/types/presence";

interface DocumentEditorProps {
  id: string;
}

interface User {
  id: string;
  email: string;
  username?: string;
}

const colors = [
  "#FF6B6B", // Red
  "#4ECDC4", // Teal
  "#45B7D1", // Blue
  "#96CEB4", // Green
  "#FFEEAD", // Yellow
  "#D4A5A5", // Pink
  "#9B59B6", // Purple
  "#3498DB", // Light Blue
];

const getUserColor = (userId: string) => {
  const index =
    Math.abs(
      userId.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0)
    ) % colors.length;
  return colors[index];
};

const debounce = (
  func: (content: string) => Promise<void>,
  wait: number
): ((content: string) => void) => {
  let timeout: NodeJS.Timeout;
  return (content: string) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(content), wait);
  };
};

// interface QuillEditor {
//   getEditor(): {
//     getSelection(): { index: number; length: number } | null;
//     getBounds(index: number): {
//       left: number;
//       top: number;
//       height: number;
//       width: number;
//     };
//     on(
//       event: string,
//       handler: (range: { index: number; length: number } | null) => void
//     ): void;
//     off(
//       event: string,
//       handler: (range: { index: number; length: number } | null) => void
//     ): void;
//   };
// }

const DocumentEditor: React.FC<DocumentEditorProps> = ({ id }) => {
  const [content, setContent] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [user, setUser] = useState<User | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [presence, setPresence] = useState<DocumentPresence>({});

  const editorRef = useRef<HTMLDivElement>(null);

  const reactQuillRef = useRef<any>(null);
  const presenceChannel = useRef<RealtimeChannel | null>(null);
  const isLocalChange = useRef(false);
  const supabase = createClient();
  const router = useRouter();

  const toolbarOptions = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ];

  const modules = {
    toolbar: toolbarOptions,
  };

  // SETUP PRESENCE & REALTIME CHANNEL
  useEffect(() => {
    const setupPresence = async () => {
      if (!user?.id || !id) return;

      const channel = supabase.channel(`document:${id}`, {
        config: {
          presence: {
            key: user.id,
          },
        },
      });

      channel.on("presence", { event: "sync" }, () => {
        const state = channel.presenceState();
        const presenceData: DocumentPresence = {};
        Object.entries(state).forEach(([key, value]) => {
          if (Array.isArray(value) && value.length > 0) {
            const presence = value[0] as unknown as UserPresence;
            presenceData[key] = presence;
          }
        });
        setPresence(presenceData);
      });

      // Listen for content changes from other users
      channel.on("broadcast", { event: "content_change" }, ({ payload }) => {
        if (payload.userId !== user.id) {
          isLocalChange.current = true;
          setContent(payload.content);
        }
      });

      channel.on("broadcast", { event: "presence" }, ({ payload }) => {
        if (payload.type === "join") {
          const { key, presence } = payload;
          setPresence((prev) => ({ ...prev, [key]: presence as UserPresence }));
        } else if (payload.type === "leave") {
          const { key } = payload;
          setPresence((prev) => {
            const newPresence = { ...prev };
            delete newPresence[key];
            return newPresence;
          });
        }
      });

      await channel.subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            user: {
              id: user.id,
              email: user.email,
              username: user.email.split("@")[0],
            },
            cursor: null,
            lastSeen: new Date().getTime(),
          });
        }
      });

      presenceChannel.current = channel;
    };

    setupPresence();

    return () => {
      if (presenceChannel.current) {
        presenceChannel.current.unsubscribe();
      }
    };
  }, [user?.id, id, supabase]);

  // HANDLE LIVE CARET (selection-change)
  useEffect(() => {
    const handleSelectionChange = async (
      range: { index: number; length: number } | null
    ) => {
      if (!range || !presenceChannel.current || !user?.id) return;

      const quill = reactQuillRef.current?.getEditor();
      if (!quill) return;

      try {
        const bounds = quill.getBounds(range.index);
        const x = bounds.left;
        const y = bounds.top;

        await presenceChannel.current.track({
          user: {
            id: user.id,
            email: user.email,
            username: user.email.split("@")[0],
          },
          cursor: { x, y },
          lastSeen: new Date().getTime(),
        });
      } catch (error) {
        console.error("Error tracking cursor position:", error);
      }
    };

    const quillInstance = reactQuillRef.current?.getEditor();
    if (quillInstance) {
      quillInstance.on("selection-change", handleSelectionChange);
    }

    return () => {
      if (quillInstance) {
        quillInstance.off("selection-change", handleSelectionChange);
      }
    };
  }, [user, presenceChannel]);

  // FETCH DOCUMENT CONTENT & USER INFO
  useEffect(() => {
    const fetchDocument = async () => {
      try {
        const {
          data: { user: supabaseUser },
        } = await supabase.auth.getUser();

        if (!supabaseUser?.id || !supabaseUser?.email) {
          console.error("User data is incomplete");
          return;
        }

        const userData: User = {
          id: supabaseUser.id,
          email: supabaseUser.email,
          username: supabaseUser.email.split("@")[0],
        };

        setUser(userData);

        const doc = await getDocument(id, userData.id);
        if (doc) {
          setContent(doc?.content);
          setOwnerId(doc?.ownerId);
        }
      } catch (err) {
        console.error("Error fetching document:", err);
      }
    };

    fetchDocument();
  }, [id, supabase]);

  // CRUD HANDLERS (SAVE, DELETE, SHARE)
  const handleSave = async () => {
    try {
      await updateDocument(id, user?.id || "", { content });
      alert("Document saved successfully!");
    } catch (err) {
      console.error("Error saving document:", err);
      alert("Error saving document");
    }
  };

  const handleDelete = async () => {
    try {
      await deleteDocument(id);
      alert("Document deleted successfully!");
      router.push("/documents");
    } catch (err) {
      console.error("Error deleting document:", err);
      alert("Error deleting document");
    }
  };

  const handleShare = () => {
    setShowShareDialog(true);
  };

  // BROADCAST CONTENT CHANGES
  const broadcastContentChange = debounce(async (newContent: string) => {
    if (!presenceChannel.current || !user?.id || isLocalChange.current) {
      isLocalChange.current = false;
      return;
    }

    await presenceChannel.current.send({
      type: "broadcast",
      event: "content_change",
      payload: {
        userId: user.id,
        content: newContent,
      },
    });
  }, 100);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    broadcastContentChange(newContent);
  };

  if (!content) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading document...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-gray-100 rounded-lg">
      <div className="mx-auto">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 mx-auto relative">
          <div className="flex justify-between items-center mb-6 mx-auto">
            <h1 className="text-3xl font-bold">Edit Document</h1>
            <div className="flex items-center gap-4">
              <div className="flex -space-x-2">
                {Object.values(presence).map((p: UserPresence) => (
                  <div
                    key={p.user.id}
                    className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
                    title={p.user.email}
                    style={{ backgroundColor: getUserColor(p.user.id) }}
                  >
                    {p.user.email[0].toUpperCase()}
                  </div>
                ))}
              </div>

              {ownerId && ownerId === user?.id && (
                <div className="flex gap-4">
                  <button
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-400 transition-all"
                    title="Delete Document"
                  >
                    <Trash2 size={24} />
                  </button>
                  <button
                    onClick={handleShare}
                    className="text-gray-400 hover:text-gray-300 transition-all"
                    title="Share Document"
                  >
                    <Share2 size={24} />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div ref={editorRef} className="relative">
            <ReactQuill
              ref={reactQuillRef}
              theme="snow"
              value={content}
              onChange={handleContentChange}
              modules={modules}
              className="mb-8"
            />

            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                top:
                  reactQuillRef.current
                    ?.getEditor()
                    .container.querySelector(".ql-toolbar")?.offsetHeight || 0,
                zIndex: 99999,
                pointerEvents: "none",
              }}
            >
              {Object.values(presence).map(
                (p: UserPresence) =>
                  p.cursor &&
                  p.user.id !== user?.id && (
                    <UserCursor
                      key={p.user.id}
                      x={p.cursor.x}
                      y={p.cursor.y}
                      color={getUserColor(p.user.id)}
                      name={p.user.email.split("@")[0]}
                    />
                  )
              )}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-blue-600 text-gray-100 py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-gray-800 focus:outline-none transition-all mt-4"
          >
            Save Document
          </button>
        </div>

        {showShareDialog && (
          <ShareDialog
            documentId={id}
            ownerId={user?.id || ""}
            currentUserId={user?.id || ""}
            isOpen={showShareDialog}
            onClose={() => setShowShareDialog(false)}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentEditor;
