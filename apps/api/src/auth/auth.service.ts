import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';

const ACCESS_TOKEN_TTL = '15m';
const REFRESH_TOKEN_TTL = '7d';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async validateUser(email: string, pass: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) return null;

    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) return null;

    return user;
  }

  async register(email: string, password: string, role: 'ADMIN' | 'TRAINER' | 'CLIENT') {
    const hashed = await bcrypt.hash(password, 10);
    const user = await this.usersService.createUser({
      email,
      passwordHash: hashed,
      role,
    });

    const tokens = await this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  async login(email: string, password: string) {
    const user = await this.validateUser(email, password);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const tokens = await this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  async refresh(userId: string, refreshToken: string) {
    const token = await this.prisma.refreshToken.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    if (!token) throw new UnauthorizedException('No refresh token');

    const isValid = await bcrypt.compare(refreshToken, token.tokenHash);
    if (!isValid) throw new UnauthorizedException('Invalid refresh token');

    const user = await this.usersService.findById(userId);
    if (!user) throw new UnauthorizedException('User not found');

    const tokens = await this.generateTokens(user.id, user.role);
    await this.storeRefreshToken(user.id, tokens.refreshToken);
    return { user, ...tokens };
  }

  private async generateTokens(userId: string, role: string) {
    const payload = { sub: userId, role };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: ACCESS_TOKEN_TTL,
    });

    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: REFRESH_TOKEN_TTL,
    });

    return { accessToken, refreshToken };
  }

  private async storeRefreshToken(userId: string, token: string) {
    const hash = await bcrypt.hash(token, 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: hash,
        expiresAt,
      },
    });
  }
}
