using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.View.Controls
{
    public class PersistentObjectAttributeImage : PersistentObjectAttributeControlBase
    {
        public PersistentObjectAttributeImage()
        {
            this.DefaultStyleKey = typeof(PersistentObjectAttributeImage);
            PersistentObjectAttributeControlBase.SetHookDatavalidationStates(this, true);
        }
    }
}