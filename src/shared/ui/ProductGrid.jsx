export default function ProductGrid({ items, renderItem }) {
  return <div className="mx-auto grid min-w-0 max-w-[1100px] grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
    {items.map((item, index) => {
      const centerLastMobileCard = items.length % 2 === 1 && index === items.length - 1
      return <div key={item.id ?? index} className={`min-w-0 ${centerLastMobileCard ? 'col-span-2 mx-auto w-1/2 lg:col-span-1 lg:w-full' : ''}`}>
        {renderItem(item)}
      </div>
    })}
  </div>
}
