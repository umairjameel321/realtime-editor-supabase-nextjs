"use client";

import { useEffect, useState } from "react";
import {
  shareDocument,
  removeShare,
  getDocumentShares,
} from "@/actions/documents";

interface ShareDialogProps {
  documentId: string;
  ownerId: string;
  currentUserId: string;
  isOpen: boolean;
  onClose: () => void;
  //   shares: Array<{
  //     id: string;
  //     userId: string;
  //     user: {
  //       email: string;
  //       username: string;
  //     };
  //   }>;
}

export default function ShareDialog({
  documentId,
  ownerId,
  currentUserId,
  isOpen,
  onClose,
}: //   shares,
ShareDialogProps) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isOwner = currentUserId === ownerId;

  const [sharedEmails, setSharedEmails] = useState<any[]>([]);

  useEffect(() => {
    async function fetchShares() {
      try {
        const sharesData: any = await getDocumentShares(documentId);
        setSharedEmails(sharesData);
      } catch (error) {
        console.error("Failed to fetch document shares:", error);
      }
    }

    fetchShares();
  }, [documentId]);

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setError("");

    try {
      const newShare = await shareDocument(documentId, currentUserId, email);
      setSharedEmails((prev) => [
        ...prev,
        { ...newShare, user: { email, username: "" } },
      ]);
      setEmail("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to share document");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveShare = async (userId: string) => {
    if (!isOwner) return;

    try {
      await removeShare(documentId, currentUserId, userId);
      setSharedEmails((prev) =>
        prev.filter((share) => share.userId !== userId)
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove share");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Share Document</h2>

        {isOwner && (
          <form onSubmit={handleShare} className="mb-6">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter email address"
              className="w-full mb-2 p-2 bg-gray-700 rounded"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
            >
              {loading ? "Sharing..." : "Share"}
            </button>
            {error && <p className="text-red-500 mt-2">{error}</p>}
          </form>
        )}

        <div className="space-y-2">
          <h3 className="font-semibold mb-2">Shared with:</h3>
          {sharedEmails.map((share) => (
            <div
              key={share.id}
              className="flex items-center justify-between bg-gray-700 p-2 rounded"
            >
              <div>
                <p>{share.user.email}</p>
              </div>
              {isOwner && (
                <button
                  onClick={() => handleRemoveShare(share.userId)}
                  className="text-red-500 hover:text-red-400"
                >
                  Remove
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={onClose}
          className="mt-4 w-full bg-gray-700 text-white py-2 px-4 rounded hover:bg-gray-600"
        >
          Close
        </button>
      </div>
    </div>
  );
}
