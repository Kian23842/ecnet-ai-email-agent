<?php
// seed.php - Run once to create the initial admin user
// Usage: php seed.php

require_once __DIR__ . '/lib/Database.php';
require_once __DIR__ . '/lib/Auth.php';
require_once __DIR__ . '/lib/Encryption.php';
require_once __DIR__ . '/lib/Response.php';

// Load .env
if (!file_exists(__DIR__ . '/.env')) {
    echo "ERROR: .env file not found. Copy .env.example to .env and fill in your values.\n";
    exit(1);
}
foreach (file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) as $line) {
    if (str_starts_with(trim($line), '#') || !str_contains($line, '=')) continue;
    [$key, $val] = explode('=', $line, 2);
    $_ENV[trim($key)] = trim($val, " \t\n\r\0\x0B\"'");
}

$adminEmail    = $_ENV['ADMIN_EMAIL']    ?? 'admin@ecnet.app';
$adminPassword = $_ENV['ADMIN_PASSWORD'] ?? 'changeme';
$orgId         = 'ecnet_default';
$orgName       = 'ECNET Default Organization';

$db = Database::getInstance();

// Create default org
$db->exec("INSERT IGNORE INTO organizations (id, name) VALUES ('{$orgId}', '{$orgName}')");

// Create admin user
$userId = Database::uuid();
$hash   = Auth::hashPassword($adminPassword);

$stmt = $db->prepare('INSERT IGNORE INTO users (id, email, password_hash, display_name, organization_id, role, status) VALUES (?, ?, ?, ?, ?, "admin", "active")');
$stmt->execute([$userId, $adminEmail, $hash, 'System Admin', $orgId]);

echo "✓ Seed complete!\n";
echo "  Admin email:    {$adminEmail}\n";
echo "  Admin password: {$adminPassword}\n";
echo "  Organization:   {$orgId}\n";
echo "\n⚠️  Change the admin password after first login!\n";
