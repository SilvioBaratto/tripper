import {
  Controller,
  Get,
  Post,
  Patch,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ItineraryService } from './itinerary.service';
import { TripResponseDto } from './dto/upload-itinerary.dto';
import {
  UpdateTripDto,
  UpdateTripDayDto,
  UpdateActivityDto,
  CreateActivityDto,
  ReorderActivitiesDto,
} from './dto/update-itinerary.dto';

@ApiTags('Itinerary')
@Controller('itineraries')
export class ItineraryController {
  private readonly logger = new Logger(ItineraryController.name);

  constructor(private readonly itineraryService: ItineraryService) {}

  @Get()
  @ApiOperation({ summary: 'List all trips' })
  async getTrips() {
    return this.itineraryService.getTrips();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single trip by ID with all nested data' })
  async getTripById(@Param('id') id: string) {
    return this.itineraryService.getTripById(id);
  }

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
  ): Promise<TripResponseDto> {
    if (!file) {
      throw new BadRequestException('PDF file is required');
    }

    this.logger.log(`Processing PDF upload: ${file.originalname}`);

    const trip = await this.itineraryService.uploadPdfAndExtract(file.buffer);

    return trip as TripResponseDto;
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update trip title/city' })
  async updateTrip(
    @Param('id') id: string,
    @Body() body: UpdateTripDto,
  ) {
    return this.itineraryService.updateTrip(id, body);
  }

  @Patch(':tripId/days/:dayId')
  @ApiOperation({ summary: 'Update a trip day' })
  async updateTripDay(
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() body: UpdateTripDayDto,
  ) {
    return this.itineraryService.updateTripDay(tripId, dayId, body);
  }

  @Patch(':tripId/activities/:activityId')
  @ApiOperation({ summary: 'Update an activity' })
  async updateActivity(
    @Param('tripId') tripId: string,
    @Param('activityId') activityId: string,
    @Body() body: UpdateActivityDto,
  ) {
    return this.itineraryService.updateActivity(tripId, activityId, body);
  }

  @Post(':tripId/days/:dayId/activities')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new activity in a day' })
  async createActivity(
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() body: CreateActivityDto,
  ) {
    return this.itineraryService.createActivity(tripId, dayId, body);
  }

  @Delete(':tripId/activities/:activityId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity' })
  async deleteActivity(
    @Param('tripId') tripId: string,
    @Param('activityId') activityId: string,
  ) {
    await this.itineraryService.deleteActivity(tripId, activityId);
  }

  @Put(':tripId/days/:dayId/reorder')
  @ApiOperation({ summary: 'Reorder activities in a day' })
  async reorderActivities(
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
    @Body() body: ReorderActivitiesDto,
  ) {
    await this.itineraryService.reorderActivities(tripId, dayId, body.activityIds);
  }

  @Delete(':tripId/days/:dayId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a day from a trip' })
  async deleteDay(
    @Param('tripId') tripId: string,
    @Param('dayId') dayId: string,
  ) {
    await this.itineraryService.deleteDay(tripId, dayId);
  }
}
