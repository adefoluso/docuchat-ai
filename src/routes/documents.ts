import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import {
  createDocumentSchema,
  listDocumentsSchema,
  documentParamsSchema,
} from '../validators/document.validator';
import {
  listDocuments,
  createDocument,
  getDocument,
  deleteDocument,
} from '../controllers/documents';

import { prisma } from '../lib/prisma';

const router = Router();

// Public route - no auth needed
router.get('/health', (req, res) => res.json({ status: 'ok' }));

// // Protected route - requires valid access token
// router.get('/documents', authenticate, async (req, res) => {
//   // req.user is guaranteed to exist here
//   const docs = await prisma.document.findMany({
//     where: { userId: req.user!.id },
//   });
//   res.json(docs);
// });


router.use(authenticate); // All document routes require auth


/**
 * @swagger
 * /documents:
 *   get:
 *     summary: List user's documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, ready, failed]
 *     responses:
 *       200:
 *         description: List of documents
 *       401:
 *         description: Not authenticated
 */
router.get('/',
  validate(listDocumentsSchema),
  listDocuments
);


router.get('/',
  validate(listDocumentsSchema),
  listDocuments
);

router.post('/',
  validate(createDocumentSchema),
  createDocument
);

router.get('/:id',
  validate(documentParamsSchema),
  getDocument
);

router.delete('/:id',
  validate(documentParamsSchema),
  deleteDocument
);

export default router;

