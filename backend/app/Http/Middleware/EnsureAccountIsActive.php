<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureAccountIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        abort_if($user && ! $user->is_admin && $user->is_suspended, 403, 'This account has been suspended. Contact marketplace support.');

        return $next($request);
    }
}
