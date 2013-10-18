using System.Collections.Generic;
using System.Linq;

namespace Vidyano.ViewModel
{
    public class ProgramUnitItemGroup : List<ProgramUnitItem>
    {
        internal ProgramUnitItemGroup(IEnumerable<ProgramUnitItem> items)
            : base(items)
        {
            var firstItem = this.FirstOrDefault();
            Title = firstItem != null ? firstItem.GroupTitle : null;
        }

        public string Title { get; internal set; }

        public int ZoomedOutCount
        {
            get { return this.Count(itm => itm.IncludeInZoomedOutItemCount); }
        }

        public override string ToString()
        {
            return Title;
        }
    }
}