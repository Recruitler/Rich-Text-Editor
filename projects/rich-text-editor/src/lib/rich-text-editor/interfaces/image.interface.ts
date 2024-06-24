export interface IIMageRes {
  url: string;
  elem: any;
}

export interface IUploadReq {
  file: File;
  elem: any;
}

export interface IImgInfo {
  domain: string;
  accountId?: string | null;
  variant?: string | null;
}
