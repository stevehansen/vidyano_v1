using System;
using System.IO;
using System.Threading.Tasks;
using Windows.Storage;
using Windows.System;

namespace Vidyano.ViewModel.Actions
{
    sealed class ShowHelp : ActionBase
    {
        public ShowHelp(Definition definition, PersistentObject parent, Query query)
            : base(definition, parent, query)
        {
        }

        public override async Task Execute(object option)
        {
            var po = await Service.Current.ExecuteActionAsync((Query != null ? "Query" : "PersistentObject") + ".ShowHelp", Parent, Query);
            if (po.FullTypeName == "Vidyano.RegisteredStream")
            {
                var result = await Service.Current.GetStreamAsync(po);
                if (result.Item2 != null)
                {
                    var file = await ApplicationData.Current.TemporaryFolder.CreateFileAsync(result.Item2, CreationCollisionOption.ReplaceExisting);
                    using (var ostream = await file.OpenStreamForWriteAsync())
                        result.Item1.CopyTo(ostream);

                    await Launcher.LaunchFileAsync(file);
                }
            }
            else
                await Launcher.LaunchUriAsync(new Uri((string)po["Document"].Value));
        }
    }
}