import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { QuestionsService } from './questions.service';
import {
  QuestionType,
  CreateQuestionDto,
  UpdateQuestionDto,
} from '@ignitron/shared';

@Controller('competition/questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  /**
   * Sanitized questions for contestants by round number (Public / Team)
   * Strictly protects correct answers, explanations, and hidden test cases.
   */
  @Get('round/:roundNumber')
  async getQuestionsForRound(
    @Param('roundNumber', ParseIntPipe) roundNumber: number,
  ) {
    const data = await this.questionsService.getSanitizedQuestionsForRound(roundNumber);
    return { success: true, data };
  }

  /**
   * Admin: List all questions with full details
   */
  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async listAdminQuestions(
    @Query('roundNumber') roundNumber?: string,
    @Query('type') type?: string,
  ) {
    const rNum = roundNumber ? parseInt(roundNumber, 10) : undefined;
    const qType = type ? (type.toUpperCase() as QuestionType) : undefined;
    const data = await this.questionsService.listAdminQuestions(rNum, qType);
    return { success: true, data };
  }

  /**
   * Admin: Seed default official question bank
   */
  @Post('seed')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async seedQuestionBank() {
    const result = await this.questionsService.seedOfficialQuestionBank();
    return { success: true, data: result };
  }

  /**
   * Admin: Get single question by ID
   */
  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async getAdminQuestion(@Param('id') id: string) {
    const data = await this.questionsService.getAdminQuestion(id);
    return { success: true, data };
  }

  /**
   * Admin: Create question
   */
  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(@Body() dto: CreateQuestionDto) {
    const data = await this.questionsService.createQuestion(dto);
    return { success: true, data };
  }

  /**
   * Admin: Update question
   */
  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async updateQuestion(
    @Param('id') id: string,
    @Body() dto: UpdateQuestionDto,
  ) {
    const data = await this.questionsService.updateQuestion(id, dto);
    return { success: true, data };
  }

  /**
   * Admin: Delete question
   */
  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  async deleteQuestion(@Param('id') id: string) {
    const data = await this.questionsService.deleteQuestion(id);
    return { success: true, data };
  }
}
