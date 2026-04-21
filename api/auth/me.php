<?php
$user = Auth::requireAuth();
unset($user['password_hash']);
Response::success($user);
