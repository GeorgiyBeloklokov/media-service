import { Prisma } from '@prisma/client';
import { MediaFilterDto, MediaSortBy, SortOrder } from '../dto/media-filter.dto';

export class QueryBuilder {
  buildWhereClause(filterDto: MediaFilterDto): Prisma.MediaWhereInput {
    const { mimeType, uploadedAfter, uploadedBefore, search } = filterDto;
    const where: Prisma.MediaWhereInput = {};

    if (mimeType) {
      where.mimeType = mimeType;
    }

    if (uploadedAfter || uploadedBefore) {
      where.createdAt = {};
      if (uploadedAfter) {
        where.createdAt.gte = new Date(uploadedAfter);
      }
      if (uploadedBefore) {
        where.createdAt.lte = new Date(uploadedBefore);
      }
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }

  buildOrderByClause(sort?: MediaSortBy, order?: SortOrder): Record<string, 'asc' | 'desc'> {
    const sortOrder = order || SortOrder.DESC;

    switch (sort) {
      case MediaSortBy.NAME:
        return { name: sortOrder };
      case MediaSortBy.SIZE:
        return { size: sortOrder };
      case MediaSortBy.CREATED_AT:
      default:
        return { createdAt: sortOrder };
    }
  }
}
