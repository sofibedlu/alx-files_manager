const isValidBase64 = (input) => {
  try {
    Buffer.from(input, 'base64');
    return true; // Valid Base64
  } catch (error) {
    return false; // Invalid Base64
  }
}

export default isValidBase64;
