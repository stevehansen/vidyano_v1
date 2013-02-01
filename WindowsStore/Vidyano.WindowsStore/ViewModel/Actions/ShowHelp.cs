using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Windows.Storage;

namespace Vidyano.ViewModel.Actions
{
    sealed class ShowHelp : ActionBase
    {
        public ShowHelp(Definition definition, PersistentObject parent, Query query) :
            base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            var po = await Service.Current.ExecuteActionAsync((Query != null ? "Query" : "PersistentObject") + ".ShowHelp", Parent, Query, null, null);
            if (po.FullTypeName == "Vidyano.RegisteredStream")
            {
                var result = await Service.Current.GetStreamAsync(po);
                if (result.Item2 != null)
                {
                    var file = await ApplicationData.Current.TemporaryFolder.CreateFileAsync(result.Item2, CreationCollisionOption.ReplaceExisting);
                    using (var ostream = await file.OpenStreamForWriteAsync())
                    {
                        result.Item1.CopyTo(ostream);
                    }

                    await Windows.System.Launcher.LaunchFileAsync(file);
                }
            }
            else
                await Windows.System.Launcher.LaunchUriAsync(new Uri((string)po["Document"].Value));
        }
    }
}