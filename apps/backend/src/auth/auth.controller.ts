import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AdminLoginDto, TeamLoginDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { AuthUser, SESSION_CONFIG } from '@ignitron/shared';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private setSessionCookie(res: Response, token: string) {
    const isProduction =
      this.configService.get<string>('app.nodeEnv') === 'production';

    res.cookie(SESSION_CONFIG.COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    });
  }

  private clearSessionCookie(res: Response) {
    res.clearCookie(SESSION_CONFIG.COOKIE_NAME, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
    });
  }

  @Post('admin/login')
  @HttpCode(HttpStatus.OK)
  async adminLogin(
    @Body() dto: AdminLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.adminLogin(dto);
    this.setSessionCookie(res, token);
    return { success: true, user };
  }

  @Get('team/lookup/:teamCode')
  async lookupTeam(@Param('teamCode') teamCode: string) {
    const team = await this.authService.lookupTeam(teamCode);
    return { success: true, team };
  }

  @Post('team/login')
  @HttpCode(HttpStatus.OK)
  async teamLogin(
    @Body() dto: TeamLoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const ip = req.ip || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const { user, token } = await this.authService.teamLogin(dto, ip, userAgent);
    this.setSessionCookie(res, token);
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: AuthUser) {
    return { success: true, user };
  }

  @UseGuards(JwtAuthGuard)
  @Post('heartbeat')
  @HttpCode(HttpStatus.OK)
  async heartbeat(@CurrentUser() user: AuthUser) {
    const result = await this.authService.heartbeat(user);
    return { success: true, ...result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
  ) {
    const result = await this.authService.changePassword(user, dto);
    return { success: true, ...result };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(user);
    this.clearSessionCookie(res);
    return { success: true, ...result };
  }
}
