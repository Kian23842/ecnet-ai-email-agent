<?php
$body = json_decode(file_get_contents('php://input'), true) ?? [];
$email    = $body['email'] ?? '';
$password = $body['password'] ?? '';
if (!$email || !$password) Response::error('Email and password required');
$result = Auth::login($email, $password);
Response::success($result, 'Login successful');
