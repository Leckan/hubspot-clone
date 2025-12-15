/**
 * Jest type extensions for better mock support
 */

declare namespace jest {
  interface MockedFunction<T extends (...args: any[]) => any> {
    mockResolvedValue(value: Awaited<ReturnType<T>>): this
    mockResolvedValueOnce(value: Awaited<ReturnType<T>>): this
    mockRejectedValue(error: any): this
    mockRejectedValueOnce(error: any): this
  }
}