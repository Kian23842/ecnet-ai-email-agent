<?php
$user = Auth::requireAuth();
$token = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
preg_match('/Bearer\s+(.+)/i', $token, $m);
if (!empty($m[1])) Auth::logout($m[1]);
Response::success(null, 'Logged out');
