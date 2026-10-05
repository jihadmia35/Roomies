import { Context, MonthView, Session, MemberProfile } from '@/domain/models';
import {
  ProfileQuery,
  PhotoRequest,
  PasswordRequest,
  CloseRequest,
  DayUpdate,
  DeleteRequest,
  HistoryDTO,
  MutationResponse,
  ParticipantsRequest,
  RecordRequest,
  SessionQuery,
  SettingsRequest,
  SettlementRequest,
} from '@/data/contracts';
export interface MessRepository {
  session(query: SessionQuery): Promise<Session>;
  view(context: Context): Promise<MonthView>;
  history(context: Context): Promise<HistoryDTO[]>;
  updateDay(context: Context, request: DayUpdate): Promise<MutationResponse>;
  saveRecord(context: Context, request: RecordRequest): Promise<MutationResponse>;
  deleteRecord(context: Context, request: DeleteRequest): Promise<MutationResponse>;
  updateSettings(context: Context, request: SettingsRequest): Promise<MutationResponse>;
  updateParticipants(context: Context, request: ParticipantsRequest): Promise<MutationResponse>;
  close(context: Context, request: CloseRequest): Promise<MutationResponse>;
  settle(context: Context, request: SettlementRequest): Promise<MutationResponse>;
  profile(query: ProfileQuery): Promise<MemberProfile>;
  updatePhoto(query: ProfileQuery, request: PhotoRequest): Promise<MemberProfile>;
  changePassword(query: ProfileQuery, request: PasswordRequest): Promise<MemberProfile>;
  reset(): Promise<void>;
}
