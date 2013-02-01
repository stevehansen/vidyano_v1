using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;

namespace Vidyano
{
    internal class Logger
    {
        static IStorageFile file;

        public static async Task Log(string message)
        {
            if (file == null)
                file = await ApplicationData.Current.LocalFolder.CreateFileAsync("VidyanoLog-" + Guid.NewGuid().ToString() + ".txt", CreationCollisionOption.ReplaceExisting);

            await FileIO.AppendTextAsync(file, message + Environment.NewLine);
        }

        public static async Task Log(string message, Exception e)
        {
            var sb = new StringBuilder();
            sb.AppendLine(message + " --- " + e.Message);
            sb.AppendLine();
            sb.AppendLine(e.GetType().ToString());
            sb.AppendLine();
            sb.AppendLine(e.StackTrace);
            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine();
            sb.AppendLine();

            await Log(sb.ToString());
        }
    }
}