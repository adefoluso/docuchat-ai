/// <reference path="../types/express.d.ts">
import { Router } from "express"
import type { Request, Response } from "express"
import { authenticate } from "../middleware/auth"
import { 
  createConversation, 
  listConversations, 
  getConversation, 
  updateConversation, 
  deleteConversation,
  sendMessage 
} from "../services/conversation.service"
import { 
  createConversationSchema, 
  updateConversationSchema, 
  listConversationsSchema, 
  sendMessageSchema,
  conversationIdSchema 
} from "../validators/conversation.validator"

const router = Router()

// POST /api/v1/conversations - Create a new conversation
router.post("/", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error("User not authenticated")
  }

  try {
    const validatedData = createConversationSchema.parse(req.body)
    const conversation = await createConversation(req.user.id, validatedData.body.documentId, validatedData.body.title)

    res.status(201).json({
      success: true,
      data: conversation
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors
        }
      })
    }
    throw error
  }
})

// GET /api/v1/conversations - List conversations with pagination and latest message preview
router.get("/", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error("User not authenticated")
  }

  try {
    const validatedQuery = listConversationsSchema.parse(req.query)
    const result = await listConversations({
      ...validatedQuery,
      userId: req.user.id
    })

    res.json({
      success: true,
      data: result.data,
      meta: result.meta
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid query parameters",
          details: error.errors
        }
      })
    }
    throw error
  }
})

// GET /api/v1/conversations/:id - Get a specific conversation with messages
router.get("/:id", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error("User not authenticated")
  }

  try {
    const { id } = conversationIdSchema.parse(req.params)
    const conversation = await getConversation(id, req.user.id)

    if (!conversation) {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Conversation not found"
        }
      })
    }

    res.json({
      success: true,
      data: conversation
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid conversation ID",
          details: error.errors
        }
      })
    }
    throw error
  }
})

// PUT /api/v1/conversations/:id - Update conversation
router.put("/:id", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error("User not authenticated")
  }

  try {
    const { id } = conversationIdSchema.parse(req.params)
    const validatedData = updateConversationSchema.parse(req.body)
    
    const conversation = await updateConversation(id, req.user.id, validatedData)

    res.json({
      success: true,
      data: conversation
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors
        }
      })
    }
    throw error
  }
})

// DELETE /api/v1/conversations/:id - Soft delete conversation
router.delete("/:id", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error("User not authenticated")
  }

  try {
    const { id } = conversationIdSchema.parse(req.params)
    await deleteConversation(id, req.user.id)

    res.json({
      success: true,
      message: "Conversation deleted successfully"
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid conversation ID",
          details: error.errors
        }
      })
    }
    throw error
  }
})

// POST /api/v1/conversations/:id/messages - Send a message (creates both user and assistant messages in transaction)
router.post("/:id/messages", authenticate, async (req: Request, res: Response) => {
  if (!req.user) {
    throw new Error("User not authenticated")
  }

  try {
    const { id } = conversationIdSchema.parse(req.params)
    const { message} = sendMessageSchema.parse(req.body)
    
    // For demo purposes, we'll create a simple assistant response
    // In a real app, this would call an AI service
    const assistantResponse = `I received your message: "${message}". This is a placeholder response.`
    
    const result = await sendMessage(id, req.user.id, message, assistantResponse)

    res.status(201).json({
      success: true,
      data: {
        userMessage: result.userMessage,
        assistantMessage: result.assistantMessage
      }
    })
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return res.status(400).json({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid input data",
          details: error.errors
        }
      })
    }
    
    if (error.message === 'Conversation not found') {
      return res.status(404).json({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Conversation not found"
        }
      })
    }
    
    throw error
  }
})

export default router