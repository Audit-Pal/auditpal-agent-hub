import type { Context } from 'hono'

export function errorResponse(c: Context, status: number, message: string, details?: unknown) {
    return c.json(
        {
            success: false,
            error: message,
            ...(details ? { details } : {}),
        },
        status as 400 | 401 | 403 | 404 | 409 | 422 | 500
    )
}

export function successResponse<T>(c: Context, data: T, status = 200) {
    return c.json({ success: true, data }, status as 200 | 201)
}

export function paginatedResponse<T>(
    c: Context,
    data: T[],
    total: number,
    page: number,
    limit: number
) {
    return c.json({
        success: true,
        data,
        meta: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    })
}
