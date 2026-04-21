<?php
declare(strict_types=1);

class Auth {
    // Returns the authenticated user array or calls Response::error and exits
    public static function requireAuth(): array {
        $token = self::getBearerToken();
        if (!$token) {
            Response::error('Unauthorized: No token provided', 401);
        }
        $db = Database::getInstance();
        $stmt = $db->prepare('
            SELECT s.user_id, s.expires_at, u.id, u.email, u.display_name,
                   u.organization_id, u.role, u.status, u.signature, u.business_context
            FROM sessions s
            JOIN users u ON u.id = s.user_id
            WHERE s.id = ? AND s.expires_at > NOW()
        ');
        $stmt->execute([$token]);
        $user = $stmt->fetch();
        if (!$user) {
            Response::error('Unauthorized: Invalid or expired token', 401);
        }
        if ($user['status'] === 'disabled') {
            Response::error('Forbidden: Account is disabled', 403);
        }
        return $user;
    }

    public static function requireAdmin(): array {
        $user = self::requireAuth();
        if ($user['role'] !== 'admin') {
            Response::error('Forbidden: Admin access required', 403);
        }
        return $user;
    }

    public static function login(string $email, string $password): array {
        $stmt = Database::query(
            'SELECT * FROM users WHERE email = ? AND status = "active" LIMIT 1',
            [strtolower(trim($email))]
        );
        $user = $stmt->fetch();
        if (!$user || !password_verify($password, $user['password_hash'])) {
            Response::error('Invalid email or password', 401);
        }
        // Create session token
        $token = bin2hex(random_bytes(32));
        $expiresAt = date('Y-m-d H:i:s', time() + (int)($_ENV['JWT_EXPIRY'] ?? 86400));
        Database::query(
            'INSERT INTO sessions (id, user_id, ip_address, user_agent, expires_at) VALUES (?, ?, ?, ?, ?)',
            [$token, $user['id'], $_SERVER['REMOTE_ADDR'] ?? '', $_SERVER['HTTP_USER_AGENT'] ?? '', $expiresAt]
        );
        unset($user['password_hash']);
        return ['token' => $token, 'user' => $user, 'expires_at' => $expiresAt];
    }

    public static function logout(string $token): void {
        Database::query('DELETE FROM sessions WHERE id = ?', [$token]);
    }

    private static function getBearerToken(): ?string {
        $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
        if (preg_match('/Bearer\s+(.+)/i', $header, $m)) {
            return trim($m[1]);
        }
        return null;
    }

    public static function hashPassword(string $password): string {
        return password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    }
}
