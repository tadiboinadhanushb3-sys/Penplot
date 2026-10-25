import jwt from 'jsonwebtoken'

export function requireAuth(request, response, next) {
  const authorization = request.headers.authorization || ''
  const [scheme, token] = authorization.split(' ')
  if (scheme !== 'Bearer' || !token) {
    return response.status(401).json({ message: 'Please log in to continue.' })
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    request.userId = payload.sub
    return next()
  } catch {
    return response.status(401).json({ message: 'Your session has expired. Please log in again.' })
  }
}

export function optionalAuth(request, response, next) {
  const authorization = request.headers.authorization || ''
  if (!authorization) return next()
  return requireAuth(request, response, next)
}
