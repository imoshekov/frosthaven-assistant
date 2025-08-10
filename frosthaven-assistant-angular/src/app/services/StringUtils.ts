class StringUtils {
  static parseInt(input: string | number): number {
    return parseInt(input !== undefined ? String(input) : '0') || 0
  }
}
