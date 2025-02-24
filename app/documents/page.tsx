"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import { Trash2, Share2, DockIcon } from "lucide-react";

import {
  getDocuments,
  createDocument,
  deleteDocument,
} from "@/actions/documents";
import ShareDialog from "@/components/ShareDialog";

import dynamic from "next/dynamic";
const ReactQuill = dynamic(() => import("react-quill-new"), { ssr: false });
import "react-quill-new/dist/quill.snow.css";

type Document = {
  id: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
  lastEditedBy: string | null;
  shares: {
    id: string;
    documentId: string;
    userId: string;
    user: {
      email: string;
      username: string;
    };
  }[];
  owner: {
    email: string;
    username: string;
  };
};

const DocumentsPage = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [user, setUser] = useState<any>(null);

  const [content, setContent] = useState("");

  const supabase = createClient();
  const router = useRouter();

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        router.push("/login");
        return;
      } else {
        setUser(user);
      }
      const docs: any = await getDocuments(user.id);
      setDocuments(docs);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleAddDocument = async () => {
    if (!content.trim()) {
      alert("Please enter some content");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user?.id) {
        router.push("/login");
        return;
      }

      await createDocument(content, user.id);
      setContent("");
      await fetchDocuments();
      router.refresh();
    } catch (error) {
      console.error("Error creating document:", error);
      alert("Failed to create document");
    }
  };

  const handleDeleteDocument = async (docId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await deleteDocument(docId);
      setDocuments((prevDocs) => prevDocs.filter((doc) => doc.id !== docId));
      router.refresh();
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  const handleShare = async (doc: Document, e: React.MouseEvent) => {
    e.stopPropagation();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (doc.ownerId !== user?.id) return;

    setSelectedDoc(doc);
    setShowShareDialog(true);
  };

  const handleDocumentClick = (docId: string) => {
    router.push(`/documents/${docId}`);
  };

  const handleShareDialogClose = () => {
    setShowShareDialog(false);
    setSelectedDoc(null);
    fetchDocuments();
  };

  const toolbarOptions = [
    [{ header: [1, 2, 3, 4, 5, 6, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    ["clean"],
  ];

  const modules = {
    toolbar: toolbarOptions,
  };

  return (
    <div className="min-h-screen text-gray-100 pt-12">
      <div className="mx-auto">
        <div className="bg-gray-800 shadow-lg rounded-lg p-6 mb-12">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">
            Create New Document
          </h2>
          <ReactQuill
            theme="snow"
            value={content}
            onChange={(value) => setContent(value)}
            modules={modules}
            className="mb-8"
          />
          <button
            onClick={handleAddDocument}
            className="w-full bg-blue-600 text-gray-100 py-2 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-400 focus:ring-offset-gray-800 focus:outline-none transition-all"
          >
            Create Document
          </button>
        </div>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-gray-400">Loading your documents...</p>
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-lg">
            <DockIcon size={48} className="mx-auto text-gray-600 mb-4" />
            <p className="text-gray-400">
              No documents yet. Create your first document above!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => handleDocumentClick(doc.id)}
                className="relative bg-gray-800 p-6 rounded-lg shadow-lg hover:shadow-xl hover:bg-gray-700 cursor-pointer transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-lg font-semibold text-gray-100 truncate pr-16">
                    {doc.content
                      .replace(/<[^>]+>/g, "")
                      .split(" ")
                      .slice(0, 5)
                      .join(" ")}
                    ...
                  </h2>

                  {doc && doc.ownerId === user?.id && (
                    <div className="absolute top-4 right-4 flex gap-2">
                      <button
                        onClick={(e) => handleDeleteDocument(doc.id, e)}
                        className="text-red-500 hover:text-red-400 transition-all p-1 rounded-full hover:bg-gray-600"
                        title="Delete Document"
                      >
                        <Trash2 size={18} />
                      </button>
                      <button
                        onClick={(e) => handleShare(doc, e)}
                        className="text-gray-400 hover:text-gray-300 transition-all p-1 rounded-full hover:bg-gray-600"
                        title="Share Document"
                      >
                        <Share2 size={18} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500">
                  <span>Version {doc.version}</span>
                  <span>
                    Shared with {doc.shares.length} user
                    {doc.shares.length !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {showShareDialog && selectedDoc && (
          <ShareDialog
            documentId={selectedDoc.id}
            ownerId={selectedDoc.ownerId}
            currentUserId={selectedDoc.ownerId}
            isOpen={showShareDialog}
            onClose={handleShareDialogClose}
          />
        )}
      </div>
    </div>
  );
};

export default DocumentsPage;
