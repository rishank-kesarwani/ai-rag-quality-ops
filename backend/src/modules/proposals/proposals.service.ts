import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import { DocumentationProposal } from '../../common/types';
import { NotificationClient } from '../integrations/notification.client';
import { CreateProposalDto, ReviewProposalDto } from './dto/proposal.dto';

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);
  private readonly proposals: Map<string, DocumentationProposal> = new Map();

  constructor(private readonly notificationClient: NotificationClient) {}

  async findAll(tenantId: string): Promise<DocumentationProposal[]> {
    return Array.from(this.proposals.values())
      .filter((p) => p.tenantId === tenantId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  async findOne(
    tenantId: string,
    proposalId: string,
  ): Promise<DocumentationProposal> {
    const proposal = this.proposals.get(proposalId);
    if (!proposal || proposal.tenantId !== tenantId) {
      throw new NotFoundException(
        `Documentation proposal "${proposalId}" not found for tenant "${tenantId}".`,
      );
    }
    return proposal;
  }

  async create(
    tenantId: string,
    dto: CreateProposalDto,
  ): Promise<DocumentationProposal> {
    const proposalId = `prop_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();
    const diffSnippet = this.generateUnifiedDiff(
      dto.currentSnippet,
      dto.proposedSnippet,
    );

    const proposal: DocumentationProposal = {
      proposalId,
      sourceId: dto.sourceId,
      sourceName: dto.sourceName,
      tenantId,
      title: dto.title,
      rationale: dto.rationale,
      triggerRunId: dto.triggerRunId,
      triggerCaseId: dto.triggerCaseId,
      currentSnippet: dto.currentSnippet,
      proposedSnippet: dto.proposedSnippet,
      diffSnippet,
      status: 'PROPOSED',
      proposedBy: dto.proposedBy || 'agent-qa-proposer',
      createdAt: now,
    };

    this.proposals.set(proposalId, proposal);
    this.logger.log(
      `Created documentation proposal ${proposalId} for tenant ${tenantId}`,
    );

    // Notify human reviewers
    await this.notificationClient.sendAlert(
      `New Documentation Proposal for Review: ${dto.title}`,
      `A new documentation improvement has been proposed for "${dto.sourceName}". Rationale: ${dto.rationale}. Please review in the ops dashboard.`,
      'BULK',
      { proposalId, sourceId: dto.sourceId },
    );

    return proposal;
  }

  async review(
    tenantId: string,
    proposalId: string,
    dto: ReviewProposalDto,
  ): Promise<DocumentationProposal> {
    const proposal = await this.findOne(tenantId, proposalId);

    if (proposal.status === 'APPROVED' || proposal.status === 'REJECTED') {
      throw new BadRequestException(
        `Proposal "${proposalId}" has already been finalized with status "${proposal.status}".`,
      );
    }

    proposal.status = dto.status;
    proposal.reviewedBy = dto.reviewedBy;
    proposal.reviewComment = dto.reviewComment;
    proposal.reviewedAt = new Date().toISOString();

    this.logger.log(
      `Proposal ${proposalId} reviewed: status changed to ${dto.status} by ${dto.reviewedBy}`,
    );

    return proposal;
  }

  seedProposal(proposal: DocumentationProposal): void {
    this.proposals.set(proposal.proposalId, proposal);
  }

  private generateUnifiedDiff(before: string, after: string): string {
    const beforeLines = before.split('\n');
    const afterLines = after.split('\n');
    const diff: string[] = ['--- current', '+++ proposed'];

    for (const line of beforeLines) {
      if (!afterLines.includes(line)) {
        diff.push(`- ${line}`);
      }
    }
    for (const line of afterLines) {
      if (!beforeLines.includes(line)) {
        diff.push(`+ ${line}`);
      } else {
        diff.push(`  ${line}`);
      }
    }

    return diff.join('\n');
  }
}
