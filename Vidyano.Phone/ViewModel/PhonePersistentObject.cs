using System;
using Microsoft.Phone.Controls;
using Newtonsoft.Json.Linq;

namespace Vidyano.ViewModel
{
    public class PhonePersistentObject : PersistentObject
    {
        internal PhonePersistentObject(JObject model)
            : base(model)
        {
        }

        public LayoutMode LayoutMode { get; set; }

        public PersistentObjectTab[] PanoramaTabs
        {
            get { return Tabs.ToArray(); }
        }

        public Action<PersistentObjectTab> CurrentTabChanged { get; internal set; }

        protected override PersistentObjectTabAttributes CreateAttributesTab(PersistentObjectAttribute[] attributes, string title, PersistentObject parent)
        {
            return new PhonePersistentObjectTabAttributes(this, attributes, title, parent);
        }

        protected override PersistentObjectTabQuery CreateQueryTab(Query query)
        {
            return new PhonePersistentObjectTabQuery(this, query);
        }

        public sealed class PhonePersistentObjectTabAttributes : PersistentObjectTabAttributes
        {
            private readonly PhonePersistentObject phoneParent;

            public PhonePersistentObjectTabAttributes(PhonePersistentObject phoneParent, PersistentObjectAttribute[] attributes, string title, PersistentObject parent)
                : base(attributes, title, parent)
            {
                this.phoneParent = phoneParent;
            }

            public override bool Equals(object obj)
            {
                var item = obj as PanoramaItem;
                if (item != null)
                {
                    if (item.Header == this && phoneParent.CurrentTabChanged != null)
                        phoneParent.CurrentTabChanged(this);

                    return item.Header == this;
                }

                return base.Equals(obj);
            }

            public override int GetHashCode()
            {
                return Title != null ? Title.GetHashCode() : 0;
            }
        }

        public sealed class PhonePersistentObjectTabQuery : PersistentObjectTabQuery
        {
            private readonly PhonePersistentObject phoneParent;

            public PhonePersistentObjectTabQuery(PhonePersistentObject phoneParent, Query query)
                : base(query)
            {
                this.phoneParent = phoneParent;
            }

            public override bool Equals(object obj)
            {
                var item = obj as PanoramaItem;
                if (item != null)
                {
                    if (item.Header == this && phoneParent.CurrentTabChanged != null)
                        phoneParent.CurrentTabChanged(this);

                    return item.Header == this;
                }

                return base.Equals(obj);
            }

            public override int GetHashCode()
            {
                return Title != null ? Title.GetHashCode() : 0;
            }
        }
    }
}