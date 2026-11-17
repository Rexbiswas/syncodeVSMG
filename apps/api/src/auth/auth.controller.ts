import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import type { Request, Response, CookieOptions } from 'express';
import { AuthService } from './auth.service.js';
import { ConfigService } from '../config/config.service.js';
import { JwtAuthGuard } from './guards/jwt-auth.guard.js';
import { CurrentUser } from './decorators/current-user.decorator.js';
import type { JwtPayload } from './token.service.js';
import type {
  RegisterInput,
  LoginInput,
  ChangePasswordInput,
} from '@syncode/validation';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {}

  private getCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.authCookieSecure,
      sameSite: this.config.authCookieSameSite,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };
  }

  private setRefreshTokenCookie(res: Response, token: string): void {
    res.cookie('syncode_refresh_token', token, this.getCookieOptions());
  }

  private clearRefreshTokenCookie(res: Response): void {
    res.clearCookie('syncode_refresh_token', {
      httpOnly: true,
      secure: this.config.authCookieSecure,
      sameSite: this.config.authCookieSameSite,
      path: '/',
    });
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() body: RegisterInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    const result = await this.authService.register(body, ipAddress, userAgent);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() body: LoginInput,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    const result = await this.authService.login(body, ipAddress, userAgent);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    // Read from HttpOnly cookie first, fall back to request body
    const rawRefreshToken = req.cookies?.['syncode_refresh_token'] || body?.refreshToken;
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    const userAgent = (req.headers['user-agent'] as string) || 'unknown';

    const result = await this.authService.refresh(rawRefreshToken, ipAddress, userAgent);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn,
      },
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.['syncode_refresh_token'] || body?.refreshToken;
    await this.authService.logout(rawRefreshToken);
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @CurrentUser('sub') userId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(userId);
    this.clearRefreshTokenCookie(res);

    return {
      success: true,
      message: 'All active sessions have been revoked',
      revokedCount: result.revokedCount,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@CurrentUser('sub') userId: string) {
    const user = await this.authService.getCurrentUser(userId);
    return {
      success: true,
      data: user,
    };
  }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Body() body: { token: string }) {
    return this.authService.verifyEmail(body);
  }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  async resendVerification(
    @Body() body: { email: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    return this.authService.resendVerification(body, ipAddress);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() body: { email: string },
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || (req.headers['x-forwarded-for'] as string) || '127.0.0.1';
    return this.authService.forgotPassword(body, ipAddress);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() body: unknown,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.resetPassword(body);
    this.clearRefreshTokenCookie(res);
    return result;
  }

  @Post('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: JwtPayload,
    @Body() body: ChangePasswordInput,
  ) {
    return this.authService.changePassword(user.sub, body, user.sessionId);
  }

  @Get('google')
  async googleAuth(@Res() res: Response) {
    if (!this.config.isGoogleAuthEnabled) {
      throw new BadRequestException({
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Google OAuth credentials are not configured in this environment. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.',
      });
    }

    // When configured, redirect to Google OAuth 2.0 endpoint
    const redirectUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      this.config.googleClientId,
    )}&redirect_uri=${encodeURIComponent(
      this.config.googleCallbackUrl,
    )}&response_type=code&scope=${encodeURIComponent('openid email profile')}&prompt=select_account`;

    return res.redirect(redirectUrl);
  }

  @Get('google/callback')
  async googleCallback(@Req() req: Request, @Res() res: Response) {
    if (!this.config.isGoogleAuthEnabled) {
      throw new BadRequestException({
        code: 'OAUTH_NOT_CONFIGURED',
        message: 'Google OAuth credentials are not configured in this environment.',
      });
    }

    const code = req.query['code'] as string;
    if (!code) {
      return res.redirect(`${this.config.corsOrigin}/login?error=oauth_failed`);
    }

    // In an actual OAuth production flow with credentials, exchange code for tokens
    // For now, redirect cleanly to frontend
    return res.redirect(`${this.config.corsOrigin}/dashboard`);
  }
}
