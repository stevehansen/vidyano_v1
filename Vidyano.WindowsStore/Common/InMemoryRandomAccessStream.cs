using System;
using System.IO;
using Windows.Foundation;
using Windows.Storage.Streams;

namespace Vidyano.Common
{
    class InMemoryRandomAccessStream : IRandomAccessStream
    {
        private readonly Stream internalStream;

        public InMemoryRandomAccessStream(Stream stream)
        {
            internalStream = stream;
        }

        public InMemoryRandomAccessStream(byte[] bytes)
        {
            internalStream = new MemoryStream(bytes, true);
        }

        public IInputStream GetInputStreamAt(ulong position)
        {
            internalStream.Seek((long)position, SeekOrigin.Begin);

            return internalStream.AsInputStream();
        }

        public IOutputStream GetOutputStreamAt(ulong position)
        {
            internalStream.Seek((long)position, SeekOrigin.Begin);

            return internalStream.AsOutputStream();
        }

        public ulong Size
        {
            get { return (ulong)internalStream.Length; }
            set { internalStream.SetLength((long)value); }
        }

        public bool CanRead
        {
            get { return true; }
        }

        public bool CanWrite
        {
            get { return true; }
        }

        public IRandomAccessStream CloneStream()
        {
            throw new NotSupportedException();
        }

        public ulong Position
        {
            get { return (ulong)internalStream.Position; }
        }

        public void Seek(ulong position)
        {
            internalStream.Seek((long)position, 0);
        }

        public void Dispose()
        {
            internalStream.Dispose();
        }

        public IAsyncOperationWithProgress<IBuffer, uint> ReadAsync(IBuffer buffer, uint count, InputStreamOptions options)
        {
            var inputStream = GetInputStreamAt(0);
            return inputStream.ReadAsync(buffer, count, options);
        }

        public IAsyncOperation<bool> FlushAsync()
        {
            var outputStream = GetOutputStreamAt(0);
            return outputStream.FlushAsync();
        }

        public IAsyncOperationWithProgress<uint, uint> WriteAsync(IBuffer buffer)
        {
            var outputStream = GetOutputStreamAt(0);
            return outputStream.WriteAsync(buffer);
        }
    }
}