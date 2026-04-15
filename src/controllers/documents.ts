import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export async function listDocuments(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);
    const status = (req.query as any).status as string | undefined;

    const where: any = { userId };
    if (status) where.status = status;

    const [total, data] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return res.json({ success: true, data, meta: { page, limit, total } });
  } catch (error) {
    console.error('listDocuments error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

export async function createDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { title, content } = req.body;

    const created = await prisma.document.create({
      data: {
        userId,
        title,
        filename: '',
        content,
        status: 'pending',
        chunkCount: 0,
      },
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('createDocument error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

export async function getDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const doc = await prisma.document.findFirst({ where: { id, userId } });
    if (!doc) return res.status(404).json({ success: false, error: 'Not found' });

    return res.json({ success: true, data: doc });
  } catch (error) {
    console.error('getDocument error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

export async function deleteDocument(req: Request, res: Response) {
  try {
    const userId = req.user!.id;
    const { id } = req.params as { id: string };

    const result = await prisma.document.deleteMany({ where: { id, userId } });
    if (result.count === 0) return res.status(404).json({ success: false, error: 'Not found' });

    return res.status(204).send();
  } catch (error) {
    console.error('deleteDocument error', error);
    return res.status(500).json({ success: false, error: 'Server error' });
  }
}

export default {
  listDocuments,
  createDocument,
  getDocument,
  deleteDocument,
};
