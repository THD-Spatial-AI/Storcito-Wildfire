/** standard api envelope */
export interface ApiResponse<T> {
  success: boolean;
  data: T;
}
