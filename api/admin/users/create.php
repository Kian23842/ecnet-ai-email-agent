<?php
$admin = Auth::requireAdmin();
$body  = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = strtolower(trim($body['email'] ?? ''));
$orgId    = trim($body['organization_id'] ?? '');
$name     = trim($body['display_name'] ?? '');
$password = $body['password'] ?? bin2hex(random_bytes(8)); // auto-generate if not provided
$role     = in_array($body['role'] ?? '', ['admin','user']) ? $body['role'] : 'user';
if (!$email || !$orgId) Response::error('Email and organization_id required');

// Ensure org exists
$org = Database::query('SELECT id FROM organizations WHERE id = ?', [$orgId])->fetch();
if (!$org) Response::error("Organization '{$orgId}' does not exist. Create it first.", 400);

$existing = Database::query('SELECT id FROM users WHERE email = ?', [$email])->fetch();
if ($existing) Response::error('A user with this email already exists', 409);

$userId = Database::uuid();
Database::query('INSERT INTO users (id, email, password_hash, display_name, organization_id, role) VALUES (?, ?, ?, ?, ?, ?)',
    [$userId, $email, Auth::hashPassword($password), $name ?: explode('@', $email)[0], $orgId, $role]);
Response::success(['id' => $userId, 'email' => $email, 'temp_password' => $password], 'User created', 201);
