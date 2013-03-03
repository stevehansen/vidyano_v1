using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace Vidyano.ViewModel
{
    public class ProgramUnitItemGroup : List<ProgramUnitItem>
    {
        internal ProgramUnitItemGroup(ProgramUnitItem[] items) :
            base(items)
        {
        }

        public string Title
        {
            get
            {
                return this.First().GroupTitle;
            }
        }

        public string ZoomedOutTitle
        {
            get
            {
                var title = Title;
                if (string.IsNullOrWhiteSpace(title))
                    title = Settings.Current.AppName;

                return title;
            }
        }

        public int ZoomedOutCount
        {
            get
            {
                return this.Where(itm => !(itm is ProgramUnitItemImage) && !(itm is ProgramUnitItemAddQuery)).Count();
            }
        }
    }
}