"use server";

import prisma from "../utils/prisma/client";
import { revalidatePath } from "next/cache";

export const getDocuments = async (userId: string) => {
  return await prisma.document.findMany({
    where: {
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    include: {
      shares: true,
      owner: true,
    },
  });
};

export async function getDocumentShares(documentId: string) {
  return await prisma.documentShare.findMany({
    where: { documentId },
    include: {
      user: true,
    },
  });
}

export const getDocument = async (id: string, userId: string) => {
  const document = await prisma.document.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
    include: {
      shares: {
        include: {
          user: true,
        },
      },
      owner: true,
    },
  });

  if (!document) throw new Error("Document not found or access denied");
  return document;
};

export const createDocument = async (content: string, ownerId: string) => {
  return await prisma.document.create({
    data: {
      content,
      ownerId,
    },
  });
};

export const updateDocument = async (
  id: string,
  userId: string,
  data: { content?: string }
) => {
  const document = await prisma.document.findFirst({
    where: {
      id,
      OR: [{ ownerId: userId }, { shares: { some: { userId } } }],
    },
  });

  if (!document) throw new Error("Document not found or permission denied");

  const updated = await prisma.document.update({
    where: { id },
    data: {
      ...data,
      version: { increment: 1 },
      lastEditedBy: userId,
    },
  });

  revalidatePath(`/documents/${id}`);
  return updated;
};

export const deleteDocument = async (id: string) => {
  return await prisma.document.delete({
    where: { id },
  });
};

export const shareDocument = async (
  documentId: string,
  ownerUserId: string,
  shareWithEmail: string
) => {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      ownerId: ownerUserId,
    },
  });

  if (!document) throw new Error("Document not found or you're not the owner");

  const shareWithUser = await prisma.userProfile.findUnique({
    where: { email: shareWithEmail },
  });

  if (!shareWithUser) throw new Error("User not found");

  const existingShare = await prisma.documentShare.findUnique({
    where: {
      documentId_userId: {
        documentId,
        userId: shareWithUser.id,
      },
    },
  });

  if (existingShare) {
    return await prisma.documentShare.update({
      where: {
        documentId_userId: {
          documentId,
          userId: shareWithUser.id,
        },
      },
      data: {},
    });
  }

  return await prisma.documentShare.create({
    data: {
      documentId,
      userId: shareWithUser.id,
    },
  });
};

export const removeShare = async (
  documentId: string,
  ownerUserId: string,
  sharedUserId: string
) => {
  const document = await prisma.document.findFirst({
    where: {
      id: documentId,
      ownerId: ownerUserId,
    },
  });

  if (!document) throw new Error("Document not found or you're not the owner");

  return await prisma.documentShare.delete({
    where: {
      documentId_userId: {
        documentId,
        userId: sharedUserId,
      },
    },
  });
};

export type Document = {
  id: string;
  content: string;
  ownerId: string;
  createdAt: Date;
  updatedAt: Date;
  shares: {
    id: string;
    documentId: string;
    userId: string;
  }[];
};
