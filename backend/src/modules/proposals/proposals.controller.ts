import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { ProposalsService } from './proposals.service';
import { CreateProposalDto, ReviewProposalDto } from './dto/proposal.dto';
import { TenantId } from '../../common/decorators/tenant.decorator';
import { TenantGuard } from '../../common/guards/tenant.guard';

@ApiTags('Documentation Proposals & Reviews')
@ApiHeader({
  name: 'x-tenant-id',
  description: 'Tenant workspace identifier',
  required: false,
})
@UseGuards(TenantGuard)
@Controller('proposals')
export class ProposalsController {
  constructor(private readonly proposalsService: ProposalsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all documentation improvement proposals for review',
  })
  @ApiResponse({ status: 200, description: 'Proposals returned' })
  async findAll(@TenantId() tenantId: string) {
    const list = await this.proposalsService.findAll(tenantId);
    return {
      success: true,
      data: list,
      count: list.length,
      tenantId,
    };
  }

  @Get(':proposalId')
  @ApiOperation({ summary: 'Get details and diff for a specific proposal' })
  @ApiResponse({ status: 200, description: 'Proposal details returned' })
  @ApiResponse({ status: 404, description: 'Proposal not found' })
  async findOne(
    @TenantId() tenantId: string,
    @Param('proposalId') proposalId: string,
  ) {
    const proposal = await this.proposalsService.findOne(tenantId, proposalId);
    return {
      success: true,
      data: proposal,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a new proposed documentation improvement for human review',
  })
  @ApiResponse({ status: 201, description: 'Proposal submitted' })
  async create(@TenantId() tenantId: string, @Body() dto: CreateProposalDto) {
    const proposal = await this.proposalsService.create(tenantId, dto);
    return {
      success: true,
      data: proposal,
    };
  }

  @Patch(':proposalId/review')
  @ApiOperation({
    summary: 'Approve or reject a documentation proposal with review notes',
  })
  @ApiResponse({ status: 200, description: 'Proposal review recorded' })
  async review(
    @TenantId() tenantId: string,
    @Param('proposalId') proposalId: string,
    @Body() dto: ReviewProposalDto,
  ) {
    const proposal = await this.proposalsService.review(
      tenantId,
      proposalId,
      dto,
    );
    return {
      success: true,
      data: proposal,
    };
  }
}
