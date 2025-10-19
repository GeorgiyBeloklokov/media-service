import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsString, IsUrl, Min, ValidateNested } from 'class-validator';

class MinioConfig {
  @IsString()
  @IsNotEmpty()
  region: string;

  @IsString()
  @IsNotEmpty()
  bucket: string;

  @IsUrl({ require_tld: false })
  endpoint: string;

  @IsString()
  @IsNotEmpty()
  rootUser: string;

  @IsString()
  @IsNotEmpty()
  rootPassword: string;
}

class ImagorVideoConfig {
  @IsUrl({ require_tld: false })
  url: string;
}

export class WorkerConfig {
  @ValidateNested()
  @Type(() => MinioConfig)
  minio: MinioConfig;

  @ValidateNested()
  @Type(() => ImagorVideoConfig)
  imagorVideo: ImagorVideoConfig;

  @IsInt()
  @Min(1)
  concurrency: number;
}
