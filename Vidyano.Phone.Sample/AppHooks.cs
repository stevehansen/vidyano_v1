using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using Vidyano.ViewModel;

namespace Vidyano.Phone.Sample
{
    class AppHooks: PhoneHooks
    {
        protected override void OnConstruct(PhonePersistentObject po)
        {
            base.OnConstruct(po);

            po.LayoutMode = LayoutMode.Panorama;
        }
    }
}