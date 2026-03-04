import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
  Request,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody, ApiBearerAuth } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import { TripResponseDto } from './dto/upload-itinerary.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Itinerary')
@ApiBearerAuth()
@Controller('itineraries')
export class ItineraryController {
  private readonly logger = new Logger(ItineraryController.name);

  constructor(private readonly itineraryService: ItineraryService) {}

  @Public() // TODO: remove after testing
  @Post('upload')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB max
      },
      fileFilter: (_req, file, callback) => {
        if (file.mimetype !== 'application/pdf') {
          return callback(
            new BadRequestException('Only PDF files are allowed'),
            false,
          );
        }
        callback(null, true);
      },
    }),
  )
  @ApiOperation({ summary: 'Upload PDF itinerary and extract structured data' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'PDF file containing travel itinerary',
        },
      },
      required: ['file'],
    },
  })
  async uploadItinerary(
    @UploadedFile() file: any,
    @Request() req: any,
  ): Promise<TripResponseDto> {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    // Extract userId from authenticated request
    // The SupabaseAuthGuard should have set req.user
    const userId = req.user?.id || req.user?.sub || '754310ad-faa5-4866-8290-a1a46b32e00e'; // TODO: remove fallback after testing

    this.logger.log(`Processing PDF upload for user ${userId}: ${file.originalname}`);

    const trip = await this.itineraryService.uploadPdfAndExtract(file.buffer, userId);

    return trip as TripResponseDto;
  }
}
